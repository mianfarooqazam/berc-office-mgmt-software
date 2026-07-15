import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { isDemoMode } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import {
  createDemoUser,
  demoPermissionsCatalog,
  listDemoUsers,
} from "@/lib/demo-store";
import { DEFAULT_EMPLOYEE_VIEWS, PERMISSIONS, type PermissionCode } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  const { error: authError } = await requirePermission("roles.write");
  if (authError) return authError;

  if (isDemoMode()) {
    return json({
      users: listDemoUsers().map((u) => ({
        id: u.id,
        email: u.email,
        roleName: u.roleName,
        isActive: u.isActive,
        permissionCodes: u.roleName === "Admin" ? PERMISSIONS.map((p) => p.code) : u.permissionCodes,
        fullName: u.employee.fullName,
        employeeId: u.employee.employeeId,
        phone: u.employee.phone,
        designation: u.employee.designation,
        createdAt: u.createdAt,
      })),
      permissions: demoPermissionsCatalog(),
      defaultViews: DEFAULT_EMPLOYEE_VIEWS,
    });
  }

  const db = getSupabaseAdmin();
  const [{ data: users, error: usersError }, { data: permissions }] = await Promise.all([
    db
      .from("users")
      .select(
        "id, email, is_active, role:roles(name), employee:employees(employee_id, full_name, phone, designation), user_permissions:user_permissions(permission:permissions(code))",
      )
      .order("email"),
    db.from("permissions").select("*").order("module"),
  ]);
  if (usersError) return error(usersError.message, 500);

  const mapped = (users || []).map((row) => {
    const camel = toCamel<{
      id: string;
      email: string;
      isActive: boolean;
      role: { name: string } | { name: string }[];
      employee: { employeeId: string; fullName: string; phone?: string; designation?: string } | null;
      userPermissions: Array<{ permission: { code: string } }>;
    }>(row);
    const role = Array.isArray(camel.role) ? camel.role[0] : camel.role;
    const emp = Array.isArray(camel.employee) ? camel.employee[0] : camel.employee;
    return {
      id: camel.id,
      email: camel.email,
      roleName: role?.name || "Employee",
      isActive: camel.isActive,
      permissionCodes: (camel.userPermissions || []).map((p) => p.permission.code),
      fullName: emp?.fullName || camel.email,
      employeeId: emp?.employeeId || "",
      phone: emp?.phone || null,
      designation: emp?.designation || null,
    };
  });

  return json({
    users: mapped,
    permissions: toCamel(permissions || []),
    defaultViews: DEFAULT_EMPLOYEE_VIEWS,
  });
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  employeeId: z.string().min(1),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  permissionCodes: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("roles.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(createSchema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const codes = (parsed.data.permissionCodes || DEFAULT_EMPLOYEE_VIEWS) as PermissionCode[];
  const passwordHash = await hashPassword(parsed.data.password);

  if (isDemoMode()) {
    try {
      const created = createDemoUser({
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
        employeeId: parsed.data.employeeId,
        phone: parsed.data.phone,
        designation: parsed.data.designation,
        permissionCodes: codes,
      });
      await writeAudit(user.id, "CREATE", "User", created.id);
      return json(
        {
          id: created.id,
          email: created.email,
          fullName: created.employee.fullName,
          permissionCodes: created.permissionCodes,
        },
        201,
      );
    } catch (e) {
      return error(e instanceof Error ? e.message : "Failed to create user", 400);
    }
  }

  const db = getSupabaseAdmin();
  const email = parsed.data.email.toLowerCase();
  const { data: employeeRole } = await db.from("roles").select("id").eq("name", "Employee").maybeSingle();
  if (!employeeRole) return error("Employee role missing. Run db seed.", 500);

  const { data: newUser, error: userError } = await db
    .from("users")
    .insert({ email, password_hash: passwordHash, role_id: employeeRole.id })
    .select("id")
    .single();
  if (userError) return error(userError.message, 500);

  const { error: empError } = await db.from("employees").insert({
    employee_id: parsed.data.employeeId,
    full_name: parsed.data.fullName,
    email,
    phone: parsed.data.phone ?? null,
    designation: parsed.data.designation ?? null,
    status: "ACTIVE",
    user_id: newUser.id,
  });
  if (empError) return error(empError.message, 500);

  const { data: perms } = await db.from("permissions").select("id, code").in("code", codes);
  if (perms?.length) {
    await db.from("user_permissions").insert(
      perms.map((p) => ({ user_id: newUser.id, permission_id: p.id })),
    );
  }

  await writeAudit(user.id, "CREATE", "User", newUser.id);
  return json({ id: newUser.id, email, permissionCodes: codes }, 201);
}
