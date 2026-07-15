import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { notifyUser } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
});

function withTaskCounts<
  T extends {
    comments?: { count: number }[] | null;
    attachments?: { count: number }[] | null;
  },
>(row: T) {
  const comments = row.comments?.[0]?.count ?? 0;
  const attachments = row.attachments?.[0]?.count ?? 0;
  const { comments: _c, attachments: _a, ...rest } = row;
  return { ...rest, _count: { comments, attachments } };
}

export async function GET(req: Request) {
  const { error: authError, user } = await requirePermission("tasks.read");
  if (authError || !user) return authError!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const mine = searchParams.get("mine") === "1";

  const db = getSupabaseAdmin();
  const assigneeEmbed = mine && user.employee ? "assignees:task_assignees!inner" : "assignees:task_assignees";
  let query = db
    .from("tasks")
    .select(
      `*, ${assigneeEmbed}(*, employee:employees(*)), created_by:users!tasks_created_by_id_fkey(*, employee:employees(*)), comments:task_comments(count), attachments:task_attachments(count)`,
    )
    .order("status")
    .order("due_date");

  if (status) query = query.eq("status", status);
  if (mine && user.employee) {
    query = query.eq("assignees.employee_id", user.employee.id);
  }

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return json(toCamel((data || []).map(withTaskCounts)));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("tasks.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: taskRow, error: createError } = await db
    .from("tasks")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority || "MEDIUM",
      due_date: parsed.data.dueDate || null,
      created_by_id: user.id,
    })
    .select("id, title")
    .single();

  if (createError || !taskRow) return error(createError?.message || "Failed to create task", 500);

  const assigneeIds = parsed.data.assigneeIds || [];
  if (assigneeIds.length) {
    const { error: assigneeError } = await db.from("task_assignees").insert(
      assigneeIds.map((employee_id) => ({ task_id: taskRow.id, employee_id })),
    );
    if (assigneeError) return error(assigneeError.message, 500);
  }

  await db.from("task_activities").insert({
    task_id: taskRow.id,
    message: `Task created by ${user.employee?.fullName || user.email}`,
  });

  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("*, assignees:task_assignees(*, employee:employees(*, user:users(*)))")
    .eq("id", taskRow.id)
    .single();

  if (fetchError) return error(fetchError.message, 500);

  const result = toCamel<{
    id: string;
    title: string;
    assignees: { employee: { userId?: string | null; email?: string } }[];
  }>(task);

  await Promise.all(
    result.assignees
      .filter((a) => a.employee.userId)
      .map((a) =>
        notifyUser({
          userId: a.employee.userId!,
          title: "New task assigned",
          body: result.title,
          link: `/tasks/${result.id}`,
          email: a.employee.email,
        }),
      ),
  );

  await writeAudit(user.id, "CREATE", "Task", result.id);
  return json(result, 201);
}
