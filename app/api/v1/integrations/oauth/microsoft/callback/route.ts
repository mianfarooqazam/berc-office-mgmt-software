import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/integrations?error=oauth_denied`);
  }

  let state: { provider: string; userId: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`);
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        redirect_uri: `${appUrl}/api/v1/integrations/oauth/microsoft/callback`,
        grant_type: "authorization_code",
      }),
    },
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange`);
  }

  const tokens = await tokenRes.json();
  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  const msProviders = INTEGRATION_PROVIDERS.filter((p) => p.oauth === "microsoft").map(
    (p) => p.id,
  );
  const providers = msProviders.includes(state.provider as never)
    ? [state.provider]
    : msProviders;

  const db = getSupabaseAdmin();
  for (const provider of providers) {
    await db.from("integrations").upsert(
      {
        provider,
        status: "CONNECTED",
        account_email: profile.mail || profile.userPrincipalName || null,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        connected_at: new Date().toISOString(),
        connected_by_id: state.userId,
        metadata: JSON.stringify({ mode: "oauth", expires_in: tokens.expires_in }),
      },
      { onConflict: "provider" },
    );
  }

  return NextResponse.redirect(`${appUrl}/integrations?connected=microsoft`);
}
