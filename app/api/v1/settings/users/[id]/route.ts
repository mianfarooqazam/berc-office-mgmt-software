import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { updateDemoUser } from "@/lib/demo-store";
import { type PermissionCode } from "@/lib/permissions";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  permissionCodes: z.array(z.string()).optional(),
  fullName: z.string().optional(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("roles.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  if (isDemoMode()) {
    try {
      const patch: Parameters<typeof updateDemoUser>[1] = {};
      if (parsed.data.password) patch.passwordHash = await hashPassword(parsed.data.password);
      if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;
      if (parsed.data.permissionCodes) {
        patch.permissionCodes = parsed.data.permissionCodes as PermissionCode[];
      }
      if (parsed.data.fullName) patch.fullName = parsed.data.fullName;
      if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;
      if (parsed.data.designation !== undefined) patch.designation = parsed.data.designation;
      const updated = updateDemoUser(id, patch);
      await writeAudit(user.id, "UPDATE", "User", id);
      return json({
        id: updated.id,
        email: updated.email,
        permissionCodes: updated.permissionCodes,
        isActive: updated.isActive,
      });
    } catch (e) {
      return error(e instanceof Error ? e.message : "Update failed", 400);
    }
  }

  const db = getSupabaseAdmin();
  const { data: target } = await db
    .from("users")
    .select("id, role:roles(name)")
    .eq("id", id)
    .maybeSingle();
  if (!target) return error("User not found", 404);

  const roleName = Array.isArray(target.role)
    ? (target.role[0] as { name: string } | undefined)?.name
    : (target.role as { name: string } | null)?.name;

  if (roleName === "Admin" && parsed.data.permissionCodes) {
    return error("Admin access cannot be restricted", 400);
  }

  const userUpdates: Record<string, unknown> = {};
  if (parsed.data.password) userUpdates.password_hash = await hashPassword(parsed.data.password);
  if (parsed.data.isActive !== undefined) userUpdates.is_active = parsed.data.isActive;
  if (Object.keys(userUpdates).length) {
    await db.from("users").update(userUpdates).eq("id", id);
  }

  if (
    parsed.data.fullName ||
    parsed.data.phone !== undefined ||
    parsed.data.designation !== undefined
  ) {
    const empUpdates: Record<string, unknown> = {};
    if (parsed.data.fullName) empUpdates.full_name = parsed.data.fullName;
    if (parsed.data.phone !== undefined) empUpdates.phone = parsed.data.phone;
    if (parsed.data.designation !== undefined) empUpdates.designation = parsed.data.designation;
    await db.from("employees").update(empUpdates).eq("user_id", id);
  }

  if (parsed.data.permissionCodes && roleName !== "Admin") {
    await db.from("user_permissions").delete().eq("user_id", id);
    const { data: perms } = await db
      .from("permissions")
      .select("id, code")
      .in("code", parsed.data.permissionCodes);
    if (perms?.length) {
      await db.from("user_permissions").insert(
        perms.map((p) => ({ user_id: id, permission_id: p.id })),
      );
    }
  }

  await writeAudit(user.id, "UPDATE", "User", id);
  return json({ ok: true });
}
