import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations";

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("integrations.write");
  if (authError || !user) return authError!;

  const { provider } = await ctx.params;
  if (!INTEGRATION_PROVIDERS.some((p) => p.id === provider)) {
    return error("Unknown provider", 404);
  }

  const db = getSupabaseAdmin();
  const { data: integration, error: dbError } = await db
    .from("integrations")
    .upsert(
      {
        provider,
        status: "DISCONNECTED",
        account_email: null,
        access_token: null,
        refresh_token: null,
        connected_at: null,
        connected_by_id: null,
        metadata: null,
      },
      { onConflict: "provider" },
    )
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(integration);
  await writeAudit(user.id, "DISCONNECT", "Integration", result.id, { provider });
  return json({ ok: true });
}
