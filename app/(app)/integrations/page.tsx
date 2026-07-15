"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cloud, Plug, Video, Calendar, HardDrive } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  accountEmail?: string | null;
  connectedAt?: string | null;
  oauthReady: boolean;
};

const ICONS: Record<string, typeof Plug> = {
  GOOGLE_DRIVE: HardDrive,
  GOOGLE_MEET: Video,
  MICROSOFT_TEAMS: Cloud,
  MICROSOFT_OUTLOOK: Calendar,
};

function IntegrationsContent() {
  const params = useSearchParams();
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [oauth, setOauth] = useState({ google: false, microsoft: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ items: IntegrationItem[]; oauth: { google: boolean; microsoft: boolean } }>(
      "/api/v1/integrations",
    );
    setItems(data.items);
    setOauth(data.oauth);
  }

  useEffect(() => {
    load().catch(console.error);
    if (params.get("connected")) setMessage("Integration connected successfully.");
    if (params.get("error")) setMessage("Connection failed. Check OAuth credentials or try local connect.");
    if (params.get("need") === "oauth") {
      setMessage("OAuth credentials are not configured. Use Connect for local/demo mode, or add client IDs in .env.");
    }
  }, [params]);

  async function connect(provider: string, mode?: "local") {
    setBusy(provider);
    setMessage("");
    try {
      const res = await api<{ mode: string; url?: string }>(`/api/v1/integrations/${provider}/connect`, {
        method: "POST",
        json: mode ? { mode } : {},
      });
      if (res.mode === "oauth" && res.url) {
        window.location.href = res.url;
        return;
      }
      setMessage(`${provider.replaceAll("_", " ")} connected${mode ? " (local/demo)" : ""}.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    try {
      await api(`/api/v1/integrations/${provider}/disconnect`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect Google Drive, Google Meet, Microsoft Teams, and Outlook."
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader>
          <div>
            <CardTitle>OAuth status</CardTitle>
            <CardDescription>
              Add credentials in <code className="text-xs">.env</code> for production sign-in. Without them,
              local/demo connect still enables Meet/Teams links in meetings.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge tone={oauth.google ? "success" : "warning"}>
            Google OAuth {oauth.google ? "ready" : "not configured"}
          </Badge>
          <Badge tone={oauth.microsoft ? "success" : "warning"}>
            Microsoft OAuth {oauth.microsoft ? "ready" : "not configured"}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = ICONS[item.id] || Plug;
          const connected = item.status === "CONNECTED";
          return (
            <Card key={item.id} hover>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
                <Badge tone={connected ? "success" : "neutral"}>{item.status}</Badge>
              </CardHeader>

              <div className="mb-4 text-sm text-[var(--muted-fg)]">
                <p>Category: {item.category}</p>
                {connected ? (
                  <>
                    <p className="mt-1">Account: {item.accountEmail || "Connected"}</p>
                    <p className="mt-1">Since: {formatDateTime(item.connectedAt)}</p>
                  </>
                ) : (
                  <p className="mt-1">Not connected</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {connected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === item.id}
                    onClick={() => disconnect(item.id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <>
                    <Button size="sm" disabled={busy === item.id} onClick={() => connect(item.id)}>
                      {item.oauthReady ? "Connect with OAuth" : "Connect"}
                    </Button>
                    {item.oauthReady ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy === item.id}
                        onClick={() => connect(item.id, "local")}
                      >
                        Connect locally
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted-fg)]">Loading integrations…</p>}>
      <IntegrationsContent />
    </Suspense>
  );
}
