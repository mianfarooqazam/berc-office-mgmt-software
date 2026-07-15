import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase";
import { toCamel } from "./mappers";
import type { PermissionCode } from "./permissions";
import { getDemoUserById, isDemoMode } from "./demo";

const COOKIE_NAME = "berc_session";
const JWT_SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export type SessionPayload = {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  employeeId?: string | null;
};

export type AppUser = {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  roleId: string;
  role: {
    id: string;
    name: string;
    permissions: { permission: { id: string; code: string; name: string; module: string } }[];
  };
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    departmentId: string | null;
    profilePhoto: string | null;
  } | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function getTokenFromRequest(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies.get(COOKIE_NAME)?.value;
}

export async function getSessionFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function mapUser(row: Record<string, unknown>): AppUser {
  const camel = toCamel<Record<string, unknown>>(row);
  const role = camel.role as Record<string, unknown> | undefined;
  const perms = (role?.permissions as Array<Record<string, unknown>>) || [];
  const employee = camel.employee as Record<string, unknown> | Array<Record<string, unknown>> | null;

  const employeeRow = Array.isArray(employee) ? employee[0] : employee;

  return {
    id: String(camel.id),
    email: String(camel.email),
    passwordHash: String(camel.passwordHash),
    isActive: Boolean(camel.isActive),
    roleId: String(camel.roleId),
    role: {
      id: String(role?.id || ""),
      name: String(role?.name || ""),
      permissions: perms.map((p) => {
        const permission = (p.permission || p) as Record<string, unknown>;
        return {
          permission: {
            id: String(permission.id || ""),
            code: String(permission.code || ""),
            name: String(permission.name || ""),
            module: String(permission.module || ""),
          },
        };
      }),
    },
    employee: employeeRow
      ? {
          id: String(employeeRow.id),
          employeeId: String(employeeRow.employeeId),
          fullName: String(employeeRow.fullName),
          departmentId: (employeeRow.departmentId as string | null) ?? null,
          profilePhoto: (employeeRow.profilePhoto as string | null) ?? null,
        }
      : null,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session) return null;

  if (isDemoMode()) {
    return getDemoUserById(session.userId);
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("users")
    .select(
      `
      *,
      role:roles(
        *,
        permissions:role_permissions(
          permission:permissions(*)
        )
      ),
      employee:employees(*)
    `,
    )
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !data) return null;
  const user = mapUser(data as Record<string, unknown>);
  if (!user.isActive) return null;
  return user;
}

export async function userHasPermission(user: AppUser, code: PermissionCode | PermissionCode[]) {
  const codes = user.role.permissions.map((rp) => rp.permission.code);
  if (user.role.name === "Administrator") return true;
  const needed = Array.isArray(code) ? code : [code];
  return needed.every((c) => codes.includes(c));
}

export { COOKIE_NAME };
