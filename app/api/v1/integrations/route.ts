import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";
import {
  INTEGRATION_PROVIDERS,
  googleOAuthConfigured,
  microsoftOAuthConfigured,
} from "@/lib/integrations";
import { listDemoIntegrations } from "@/lib/demo-store";

export async function GET() {
  const { error: authError } = await requirePermission("integrations.read");
  if (authError) return authError;

  let camelRows: {
    provider: string;
    status: string;
    accountEmail: string | null;
    connectedAt: string | null;
  }[] = [];

  if (isDemoMode()) {
    camelRows = listDemoIntegrations();
  } else {
    const db = getSupabaseAdmin();
    const { data: rows, error: dbError } = await db.from("integrations").select("*");
    if (dbError) return error(dbError.message, 500);
    camelRows = toCamel(rows || []);
  }

  const byProvider = Object.fromEntries(camelRows.map((r) => [r.provider, r]));

  const items = INTEGRATION_PROVIDERS.map((p) => {
    const row = byProvider[p.id];
    return {
      ...p,
      status: row?.status || "DISCONNECTED",
      accountEmail: row?.accountEmail || null,
      connectedAt: row?.connectedAt || null,
      oauthReady:
        p.oauth === "google" ? googleOAuthConfigured() : microsoftOAuthConfigured(),
    };
  });

  return json({
    items,
    oauth: {
      google: googleOAuthConfigured(),
      microsoft: microsoftOAuthConfigured(),
    },
  });
}
