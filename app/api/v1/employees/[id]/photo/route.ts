import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("employees.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return error("file is required", 400);

  const saved = await saveUpload(file, `photos`);
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("employees")
    .update({ profile_photo: saved.filePath })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  await writeAudit(user.id, "UPDATE", "Employee", id, { profilePhoto: saved.filePath });
  return json(toCamel(data));
}
