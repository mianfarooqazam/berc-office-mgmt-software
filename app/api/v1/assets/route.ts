import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  assetId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  assignedToId: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyUntil: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("assets.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");

  const db = getSupabaseAdmin();
  let query = db
    .from("assets")
    .select("*, assigned_to:employees!assets_assigned_to_id_fkey(*)")
    .order("asset_id");

  if (q) query = query.or(`name.ilike.%${q}%,asset_id.ilike.%${q}%`);
  if (category) query = query.eq("category", category);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("assets.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("assets")
    .insert({
      asset_id: parsed.data.assetId,
      name: parsed.data.name,
      category: parsed.data.category,
      assigned_to_id: parsed.data.assignedToId || null,
      purchase_date: parsed.data.purchaseDate || null,
      warranty_until: parsed.data.warrantyUntil || null,
      status: parsed.data.status || (parsed.data.assignedToId ? "ASSIGNED" : "AVAILABLE"),
      notes: parsed.data.notes ?? null,
    })
    .select("*, assigned_to:employees!assets_assigned_to_id_fkey(*)")
    .single();

  if (dbError) return error(dbError.message, 500);

  const asset = toCamel<{ id: string }>(data);
  await writeAudit(user.id, "CREATE", "Asset", asset.id);
  return json(asset, 201);
}
