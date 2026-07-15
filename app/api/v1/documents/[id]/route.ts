import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("documents.read");
  if (authError) return authError;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("documents")
    .select(
      "*, folder:document_folders(*), employee:employees(*), versions:document_versions(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const document = toCamel<{ versions?: { version?: number }[] }>(data);
  if (Array.isArray(document.versions)) {
    document.versions.sort((a, b) => (b.version || 0) - (a.version || 0));
  }
  return json(document);
}

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("documents.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return error("file is required", 400);

  const db = getSupabaseAdmin();
  const { data: latest } = await db
    .from("document_versions")
    .select("version")
    .eq("document_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saved = await saveUpload(file, "documents");
  const nextVersion = (latest?.version || 0) + 1;
  const { data: version, error: dbError } = await db
    .from("document_versions")
    .insert({
      document_id: id,
      version: nextVersion,
      file_path: saved.filePath,
      mime_type: saved.mimeType,
      size: saved.size,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  await db.from("documents").update({ updated_at: new Date().toISOString() }).eq("id", id);
  const result = toCamel<{ version: number }>(version);
  await writeAudit(user.id, "VERSION", "Document", id, { version: result.version });
  return json(result, 201);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("documents.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("documents").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "Document", id);
  return json({ ok: true });
}
