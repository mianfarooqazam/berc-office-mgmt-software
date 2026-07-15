import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel, toSnake } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.string().optional(),
  bankDetails: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("employees.read");
  if (authError) return authError;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("employees")
    .select(
      "*, user:users(*, role:roles(*)), employee_docs:employee_documents(*), assets:assets!assets_assigned_to_id_fkey(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const employee = toCamel<{
    employeeDocs?: { createdAt?: string }[];
  }>(data);
  if (Array.isArray(employee.employeeDocs)) {
    employee.employeeDocs.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  }
  return json(employee);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("employees.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(updateSchema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const update: Record<string, unknown> = toSnake(parsed.data as Record<string, unknown>);
  if (parsed.data.joiningDate !== undefined) {
    update.joining_date = parsed.data.joiningDate || null;
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("employees")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (dbError) return error(dbError.message, 500);

  const employee = toCamel<{ id: string }>(data);
  await writeAudit(user.id, "UPDATE", "Employee", employee.id);
  return json(employee);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("employees.delete");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data: employee, error: findError } = await db
    .from("employees")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (findError) return error(findError.message, 500);
  if (!employee) return error("Not found", 404);

  const { error: delError } = await db.from("employees").delete().eq("id", id);
  if (delError) return error(delError.message, 500);

  if (employee.user_id) {
    await db.from("users").update({ is_active: false }).eq("id", employee.user_id);
  }

  await writeAudit(user.id, "DELETE", "Employee", id);
  return json({ ok: true });
}
