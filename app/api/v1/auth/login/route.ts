import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { createToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { error, json, parseBody, writeAudit } from "@/lib/api";
import { findDemoAccount } from "@/lib/demo";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  if (isDemoMode()) {
    const account = findDemoAccount(email);
    if (!account) return error("Invalid email or password", 401);
    const ok = await verifyPassword(password, account.passwordHash);
    if (!ok) return error("Invalid email or password", 401);

    const token = await createToken({
      userId: account.id,
      email: account.email,
      roleId: account.roleId,
      roleName: account.roleName,
      employeeId: account.employeeId,
    });
    await setSessionCookie(token);

    return json({
      user: {
        id: account.id,
        email: account.email,
        role: account.roleName,
        employeeId: account.employeeId,
        fullName: account.fullName,
      },
      demo: true,
    });
  }

  const db = getSupabaseAdmin();
  const { data: row, error: dbError } = await db
    .from("users")
    .select("*, role:roles(*), employee:employees(*)")
    .eq("email", email)
    .maybeSingle();

  if (dbError || !row) return error("Invalid email or password", 401);

  const user = toCamel<{
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    roleId: string;
    role: { name: string };
    employee: { id: string; fullName: string } | { id: string; fullName: string }[] | null;
  }>(row);

  if (!user.isActive) return error("Invalid email or password", 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return error("Invalid email or password", 401);

  const employee = Array.isArray(user.employee) ? user.employee[0] : user.employee;

  const token = await createToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    employeeId: employee?.id ?? null,
  });
  await setSessionCookie(token);
  await writeAudit(user.id, "LOGIN", "User", user.id);

  return json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role.name,
      employeeId: employee?.id ?? null,
      fullName: employee?.fullName ?? user.email,
    },
  });
}
