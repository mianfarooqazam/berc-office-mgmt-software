import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  assignedToId: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyUntil: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("assets.read");
  if (authError) return authError;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("assets")
    .select(
      "*, assigned_to:employees!assets_assigned_to_id_fkey(*), maintenance:asset_maintenance(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const asset = toCamel<{ maintenance?: { performedAt?: string }[] }>(data);
  if (Array.isArray(asset.maintenance)) {
    asset.maintenance.sort((a, b) =>
      String(b.performedAt || "").localeCompare(String(a.performedAt || "")),
    );
  }
  return json(asset);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("assets.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.assignedToId !== undefined) update.assigned_to_id = parsed.data.assignedToId;
  if (parsed.data.purchaseDate !== undefined) update.purchase_date = parsed.data.purchaseDate || null;
  if (parsed.data.warrantyUntil !== undefined) {
    update.warranty_until = parsed.data.warrantyUntil || null;
  }
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
  } else if (parsed.data.assignedToId === null) {
    update.status = "AVAILABLE";
  } else if (parsed.data.assignedToId) {
    update.status = "ASSIGNED";
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("assets")
    .update(update)
    .eq("id", id)
    .select("*, assigned_to:employees!assets_assigned_to_id_fkey(*)")
    .single();

  if (dbError) return error(dbError.message, 500);

  await writeAudit(user.id, "UPDATE", "Asset", id);
  return json(toCamel(data));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("assets.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("assets").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "Asset", id);
  return json({ ok: true });
}
