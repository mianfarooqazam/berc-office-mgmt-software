import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("employees.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data: employee } = await db.from("employees").select("id").eq("id", id).maybeSingle();
  if (!employee) return error("Not found", 404);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return error("file is required", 400);
  const category = String(form.get("category") || "General");

  const saved = await saveUpload(file, `employees/${id}`);
  const { data: doc, error: dbError } = await db
    .from("employee_documents")
    .insert({
      employee_id: id,
      name: saved.name,
      category,
      file_path: saved.filePath,
      mime_type: saved.mimeType,
      size: saved.size,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(doc);
  await writeAudit(user.id, "UPLOAD", "EmployeeDocument", result.id);
  return json(result, 201);
}
