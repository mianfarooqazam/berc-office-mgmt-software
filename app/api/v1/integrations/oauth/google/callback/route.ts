import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/integrations?error=oauth_denied`);
  }

  let state: { provider: string; userId: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${appUrl}/api/v1/integrations/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange`);
  }

  const tokens = await tokenRes.json();
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  const googleProviders = INTEGRATION_PROVIDERS.filter((p) => p.oauth === "google").map(
    (p) => p.id,
  );
  const providers = googleProviders.includes(state.provider as never)
    ? [state.provider]
    : googleProviders;

  const db = getSupabaseAdmin();
  for (const provider of providers) {
    await db.from("integrations").upsert(
      {
        provider,
        status: "CONNECTED",
        account_email: profile.email || null,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        connected_at: new Date().toISOString(),
        connected_by_id: state.userId,
        metadata: JSON.stringify({ mode: "oauth", expires_in: tokens.expires_in }),
      },
      { onConflict: "provider" },
    );
  }

  return NextResponse.redirect(`${appUrl}/integrations?connected=google`);
}
