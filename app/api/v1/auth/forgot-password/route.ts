import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { error, json, parseBody } from "@/lib/api";
import { sendEmail } from "@/lib/mail";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("id, email")
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();

  if (!user) {
    return json({ message: "If that email exists, a reset link was sent." });
  }

  const token = randomBytes(32).toString("hex");
  await db.from("password_reset_tokens").insert({
    token,
    user_id: user.id,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  });

  const link = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  await sendEmail(
    user.email,
    "Reset your BERC password",
    `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`,
  );

  return json({
    message: "If that email exists, a reset link was sent.",
    ...(process.env.NODE_ENV !== "production" ? { resetToken: token } : {}),
  });
}
