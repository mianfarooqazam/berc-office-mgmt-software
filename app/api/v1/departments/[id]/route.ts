import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel, toSnake } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

function withEmployeeCount<T extends { employees?: { count: number }[] | null }>(row: T) {
  const count = row.employees?.[0]?.count ?? 0;
  const { employees: _employees, ...rest } = row;
  return { ...rest, _count: { employees: count } };
}

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("departments.read");
  if (authError) return authError;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("departments")
    .select("*, manager:employees!departments_manager_id_fkey(*), employees(*)")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const department = toCamel<{ employees?: { fullName?: string }[] }>(data);
  if (Array.isArray(department.employees)) {
    department.employees.sort((a, b) =>
      String(a.fullName || "").localeCompare(String(b.fullName || "")),
    );
  }
  return json(department);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("departments.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("departments")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", id)
    .select("*, manager:employees!departments_manager_id_fkey(*), employees(count)")
    .single();

  if (dbError) return error(dbError.message, 500);

  const department = toCamel(withEmployeeCount(data));
  await writeAudit(user.id, "UPDATE", "Department", id);
  return json(department);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("departments.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  await db.from("employees").update({ department_id: null }).eq("department_id", id);
  const { error: dbError } = await db.from("departments").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);

  await writeAudit(user.id, "DELETE", "Department", id);
  return json({ ok: true });
}
