import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("tasks.read");
  if (authError) return authError;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("tasks")
    .select(
      "*, assignees:task_assignees(*, employee:employees(*)), comments:task_comments(*, user:users(*, employee:employees(*))), attachments:task_attachments(*), activities:task_activities(*), created_by:users!tasks_created_by_id_fkey(*, employee:employees(*))",
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const task = toCamel<{
    comments?: { createdAt?: string }[];
    activities?: { createdAt?: string }[];
  }>(data);
  if (Array.isArray(task.comments)) {
    task.comments.sort((a, b) =>
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
    );
  }
  if (Array.isArray(task.activities)) {
    task.activities.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  }
  return json(task);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("tasks.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();

  if (parsed.data.assigneeIds) {
    await db.from("task_assignees").delete().eq("task_id", id);
    if (parsed.data.assigneeIds.length) {
      const { error: assigneeError } = await db.from("task_assignees").insert(
        parsed.data.assigneeIds.map((employee_id) => ({ task_id: id, employee_id })),
      );
      if (assigneeError) return error(assigneeError.message, 500);
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.dueDate !== undefined) update.due_date = parsed.data.dueDate || null;

  if (Object.keys(update).length) {
    const { error: updateError } = await db.from("tasks").update(update).eq("id", id);
    if (updateError) return error(updateError.message, 500);
  }

  await db.from("task_activities").insert({
    task_id: id,
    message: `Updated by ${user.employee?.fullName || user.email}${
      parsed.data.status ? ` → ${parsed.data.status}` : ""
    }`,
  });

  const { data, error: fetchError } = await db
    .from("tasks")
    .select("*, assignees:task_assignees(*, employee:employees(*))")
    .eq("id", id)
    .single();

  if (fetchError) return error(fetchError.message, 500);

  await writeAudit(user.id, "UPDATE", "Task", id);
  return json(toCamel(data));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("tasks.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("tasks").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "Task", id);
  return json({ ok: true });
}
