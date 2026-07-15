import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import {
  INTEGRATION_PROVIDERS,
  buildGoogleAuthUrl,
  buildMicrosoftAuthUrl,
  googleOAuthConfigured,
  microsoftOAuthConfigured,
  type IntegrationProviderId,
} from "@/lib/integrations";

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("integrations.write");
  if (authError || !user) return authError!;

  const { provider } = await ctx.params;
  const def = INTEGRATION_PROVIDERS.find((p) => p.id === provider);
  if (!def) return error("Unknown provider", 404);

  const body = await req.json().catch(() => ({}));
  const forceLocal = body.mode === "local" || body.mode === "demo";

  const oauthReady =
    def.oauth === "google" ? googleOAuthConfigured() : microsoftOAuthConfigured();

  if (oauthReady && !forceLocal) {
    const state = Buffer.from(
      JSON.stringify({ provider, userId: user.id, ts: Date.now() }),
    ).toString("base64url");
    const url =
      def.oauth === "google" ? buildGoogleAuthUrl(state) : buildMicrosoftAuthUrl(state);
    return json({ mode: "oauth", url });
  }

  const accountEmail = body.accountEmail || user.email;
  const db = getSupabaseAdmin();
  const { data: integration, error: dbError } = await db
    .from("integrations")
    .upsert(
      {
        provider,
        status: "CONNECTED",
        account_email: accountEmail,
        connected_at: new Date().toISOString(),
        connected_by_id: user.id,
        metadata: JSON.stringify({
          mode: "local",
          note: "Connected in local/demo mode. Add OAuth client credentials for production.",
        }),
      },
      { onConflict: "provider" },
    )
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(integration);
  await writeAudit(user.id, "CONNECT", "Integration", result.id, { provider });
  return json({ mode: "local", integration: result });
}

export async function GET(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("integrations.write");
  if (authError || !user) return authError!;

  const { provider } = await ctx.params;
  const def = INTEGRATION_PROVIDERS.find((p) => p.id === (provider as IntegrationProviderId));
  if (!def) return error("Unknown provider", 404);

  const oauthReady =
    def.oauth === "google" ? googleOAuthConfigured() : microsoftOAuthConfigured();

  if (oauthReady) {
    const state = Buffer.from(
      JSON.stringify({ provider, userId: user.id, ts: Date.now() }),
    ).toString("base64url");
    const url =
      def.oauth === "google" ? buildGoogleAuthUrl(state) : buildMicrosoftAuthUrl(state);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/integrations?need=oauth", req.url));
}
