import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";
import { error, json, parseBody, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: record } = await db
    .from("password_reset_tokens")
    .select("*")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    return error("Invalid or expired token", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.from("users").update({ password_hash: passwordHash }).eq("id", record.user_id);
  await db
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id);

  await writeAudit(record.user_id, "PASSWORD_RESET", "User", record.user_id);
  return json({ ok: true });
}
