import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1),
  cost: z.number().optional().nullable(),
  performedAt: z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("assets.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: record, error: dbError } = await db
    .from("asset_maintenance")
    .insert({
      asset_id: id,
      description: parsed.data.description,
      cost: parsed.data.cost ?? null,
      performed_at: parsed.data.performedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  await db.from("assets").update({ status: "MAINTENANCE" }).eq("id", id);
  const result = toCamel<{ id: string }>(record);
  await writeAudit(user.id, "CREATE", "AssetMaintenance", result.id);
  return json(result, 201);
}
