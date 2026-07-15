import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getCurrentUser, getSessionFromRequest, userHasPermission } from "./auth";
import type { PermissionCode } from "./permissions";
import { getSupabaseAdmin, isDemoMode } from "./supabase";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function requireAuth(req?: NextRequest) {
  if (req) {
    const session = await getSessionFromRequest(req);
    if (!session) return { error: error("Unauthorized", 401) as NextResponse, user: null };
  }

  const user = await getCurrentUser();
  if (!user) return { error: error("Unauthorized", 401) as NextResponse, user: null };
  return { error: null, user };
}

export async function requirePermission(
  permission: PermissionCode | PermissionCode[],
  req?: NextRequest,
) {
  const result = await requireAuth(req);
  if (result.error || !result.user) return result;

  const ok = await userHasPermission(result.user, permission);
  if (!ok) return { error: error("Forbidden", 403) as NextResponse, user: null };
  return result;
}

export function parseBody<T>(schema: ZodSchema<T>, data: unknown) {
  try {
    return { data: schema.parse(data), error: null };
  } catch (e) {
    if (e instanceof ZodError) {
      return { data: null, error: error("Validation failed", 422, e.flatten()) };
    }
    return { data: null, error: error("Invalid request body", 400) };
  }
}

export async function writeAudit(
  userId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: unknown,
) {
  if (isDemoMode()) {
    const { pushAudit } = await import("./demo-store");
    pushAudit(userId ?? null, action, entity, entityId);
    return;
  }
  const db = getSupabaseAdmin();
  await db.from("audit_logs").insert({
    user_id: userId ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}
