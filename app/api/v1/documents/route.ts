import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("documents.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const folderId = searchParams.get("folderId");

  const db = getSupabaseAdmin();
  let query = db
    .from("documents")
    .select("*, folder:document_folders(*), versions:document_versions(*)")
    .order("updated_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);
  if (folderId) query = query.eq("folder_id", folderId);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);

  const documents = toCamel<
    { versions?: { version?: number }[] }[]
  >((data || []).map((doc) => {
    const versions = Array.isArray(doc.versions)
      ? [...doc.versions].sort((a, b) => (b.version || 0) - (a.version || 0)).slice(0, 1)
      : [];
    return { ...doc, versions };
  }));

  return json(documents);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("documents.write");
  if (authError || !user) return authError!;

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "");
  const category = String(form.get("category") || "General");
  const folderId = form.get("folderId") ? String(form.get("folderId")) : null;
  const employeeId = form.get("employeeId") ? String(form.get("employeeId")) : null;

  if (!(file instanceof File)) return error("file is required", 400);
  if (!title) return error("title is required", 400);

  const saved = await saveUpload(file, "documents");
  const db = getSupabaseAdmin();
  const { data: document, error: createError } = await db
    .from("documents")
    .insert({
      title,
      category,
      folder_id: folderId,
      employee_id: employeeId,
    })
    .select("id")
    .single();

  if (createError || !document) {
    return error(createError?.message || "Failed to create document", 500);
  }

  const { error: versionError } = await db.from("document_versions").insert({
    document_id: document.id,
    version: 1,
    file_path: saved.filePath,
    mime_type: saved.mimeType,
    size: saved.size,
  });
  if (versionError) return error(versionError.message, 500);

  const { data: full, error: fetchError } = await db
    .from("documents")
    .select("*, folder:document_folders(*), versions:document_versions(*)")
    .eq("id", document.id)
    .single();

  if (fetchError) return error(fetchError.message, 500);

  const result = toCamel<{ id: string }>(full);
  await writeAudit(user.id, "CREATE", "Document", result.id);
  return json(result, 201);
}
