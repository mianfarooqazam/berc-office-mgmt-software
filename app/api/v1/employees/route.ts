import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { listDemoUsers } from "@/lib/demo-store";
import { z } from "zod";

const createSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional().nullable(),
  status: z.string().optional(),
  bankDetails: z.string().optional(),
  createLogin: z.boolean().optional(),
  roleId: z.string().optional(),
  password: z.string().optional(),
});

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("employees.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");

  if (isDemoMode()) {
    let rows = listDemoUsers().map((u) => ({
      id: u.employee.id,
      employeeId: u.employee.employeeId,
      fullName: u.employee.fullName,
      email: u.employee.email,
      phone: u.employee.phone,
      designation: u.employee.designation,
      status: u.employee.status,
      user: { id: u.id, role: { name: u.roleName } },
    }));
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          r.employeeId.toLowerCase().includes(needle),
      );
    }
    if (status) rows = rows.filter((r) => r.status === status);
    return json(rows);
  }

  const db = getSupabaseAdmin();
  let query = db
    .from("employees")
    .select("*, user:users(*, role:roles(*))")
    .order("full_name");

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,employee_id.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("status", status);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("employees.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(createSchema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const email = parsed.data.email.toLowerCase();

  const [{ data: byId }, { data: byEmail }] = await Promise.all([
    db.from("employees").select("id").eq("employee_id", parsed.data.employeeId).maybeSingle(),
    db.from("employees").select("id").eq("email", email).maybeSingle(),
  ]);
  if (byId || byEmail) return error("Employee ID or email already exists", 409);

  let userId: string | undefined;
  if (parsed.data.createLogin) {
    let roleId = parsed.data.roleId;
    if (!roleId) {
      const { data: role } = await db.from("roles").select("id").eq("name", "Employee").maybeSingle();
      roleId = role?.id;
    }
    if (!roleId) return error("Role not found", 400);

    const passwordHash = await hashPassword(parsed.data.password || "Welcome@123");
    const { data: newUser, error: userError } = await db
      .from("users")
      .insert({ email, password_hash: passwordHash, role_id: roleId })
      .select("id")
      .single();
    if (userError) return error(userError.message, 500);
    userId = newUser.id;
  }

  const { data: employee, error: dbError } = await db
    .from("employees")
    .insert({
      employee_id: parsed.data.employeeId,
      full_name: parsed.data.fullName,
      email,
      phone: parsed.data.phone ?? null,
      cnic: parsed.data.cnic ?? null,
      address: parsed.data.address ?? null,
      emergency_contact: parsed.data.emergencyContact ?? null,
      designation: parsed.data.designation ?? null,
      joining_date: parsed.data.joiningDate || null,
      status: parsed.data.status || "ACTIVE",
      bank_details: parsed.data.bankDetails ?? null,
      user_id: userId ?? null,
    })
    .select("*")
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string; employeeId: string }>(employee);
  await writeAudit(user.id, "CREATE", "Employee", result.id, { employeeId: result.employeeId });
  return json(result, 201);
}
