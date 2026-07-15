import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
});

function withEmployeeCount<T extends { employees?: { count: number }[] | null }>(row: T) {
  const count = row.employees?.[0]?.count ?? 0;
  const { employees: _employees, ...rest } = row;
  return { ...rest, _count: { employees: count } };
}

export async function GET() {
  const { error: authError } = await requirePermission("departments.read");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("departments")
    .select("*, manager:employees!departments_manager_id_fkey(*), employees(count)")
    .order("name");

  if (dbError) return error(dbError.message, 500);
  return json(toCamel((data || []).map(withEmployeeCount)));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("departments.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: exists } = await db
    .from("departments")
    .select("id")
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (exists) return error("Department already exists", 409);

  const { data, error: dbError } = await db
    .from("departments")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      manager_id: parsed.data.managerId || null,
    })
    .select("*, manager:employees!departments_manager_id_fkey(*), employees(count)")
    .single();

  if (dbError) return error(dbError.message, 500);

  const department = toCamel<{ id: string }>(withEmployeeCount(data));
  await writeAudit(user.id, "CREATE", "Department", department.id);
  return json(department, 201);
}
