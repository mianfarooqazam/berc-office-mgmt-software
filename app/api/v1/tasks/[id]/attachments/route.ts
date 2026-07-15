import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("tasks.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return error("file is required", 400);

  const saved = await saveUpload(file, `tasks/${id}`);
  const db = getSupabaseAdmin();
  const { data: attachment, error: dbError } = await db
    .from("task_attachments")
    .insert({
      task_id: id,
      name: saved.name,
      file_path: saved.filePath,
      mime_type: saved.mimeType,
      size: saved.size,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  await db.from("task_activities").insert({
    task_id: id,
    message: `${user.employee?.fullName || user.email} uploaded ${saved.name}`,
  });

  return json(toCamel(attachment), 201);
}
