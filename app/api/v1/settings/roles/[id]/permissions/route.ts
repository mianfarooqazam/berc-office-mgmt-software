import { getSupabaseAdmin } from "@/lib/supabase";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  permissionIds: z.array(z.string()),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("roles.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { error: deleteError } = await db.from("role_permissions").delete().eq("role_id", id);
  if (deleteError) return error(deleteError.message, 500);

  if (parsed.data.permissionIds.length) {
    const { error: insertError } = await db.from("role_permissions").insert(
      parsed.data.permissionIds.map((permission_id) => ({
        role_id: id,
        permission_id,
      })),
    );
    if (insertError) return error(insertError.message, 500);
  }

  await writeAudit(user.id, "UPDATE", "RolePermissions", id);
  return json({ ok: true });
}
