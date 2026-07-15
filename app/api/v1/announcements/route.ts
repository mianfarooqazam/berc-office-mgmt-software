import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { notifyUser } from "@/lib/notifications";
import { z } from "zod";

export async function GET() {
  const { error: authError } = await requirePermission("announcements.read");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("announcements")
    .select("*, author:users(*, employee:employees(*))")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  pinned: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("announcements.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: item, error: dbError } = await db
    .from("announcements")
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned || false,
      author_id: user.id,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string; title: string }>(item);
  const { data: users } = await db.from("users").select("id, email").eq("is_active", true);
  await Promise.all(
    (users || []).map((u) =>
      notifyUser({
        userId: u.id,
        title: "New announcement",
        body: result.title,
        link: "/announcements",
        email: u.email,
      }),
    ),
  );

  await writeAudit(user.id, "CREATE", "Announcement", result.id);
  return json(result, 201);
}
