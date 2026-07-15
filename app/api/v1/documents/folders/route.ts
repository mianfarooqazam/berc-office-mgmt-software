import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

function withFolderCounts<
  T extends {
    documents?: { count: number }[] | null;
    children?: { count: number }[] | null;
  },
>(row: T) {
  const documents = row.documents?.[0]?.count ?? 0;
  const children = row.children?.[0]?.count ?? 0;
  const { documents: _d, children: _c, ...rest } = row;
  return { ...rest, _count: { documents, children } };
}

export async function GET() {
  const { error: authError } = await requirePermission("documents.read");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("document_folders")
    .select(
      "*, documents(count), children:document_folders!document_folders_parent_id_fkey(count)",
    )
    .order("name");

  if (dbError) return error(dbError.message, 500);
  return json(toCamel((data || []).map(withFolderCounts)));
}

const schema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("documents.write");
  if (authError || !user) return authError!;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: folder, error: dbError } = await db
    .from("document_folders")
    .insert({
      name: parsed.data.name,
      parent_id: parsed.data.parentId || null,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(folder);
  await writeAudit(user.id, "CREATE", "DocumentFolder", result.id);
  return json(result, 201);
}
