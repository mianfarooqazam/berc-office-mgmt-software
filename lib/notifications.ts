import { getSupabaseAdmin, isDemoMode } from "./supabase";
import { sendEmail } from "./mail";

export async function notifyUser(opts: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  email?: string;
}) {
  if (isDemoMode()) return;

  const db = getSupabaseAdmin();
  await db.from("notifications").insert({
    user_id: opts.userId,
    title: opts.title,
    body: opts.body ?? null,
    link: opts.link ?? null,
  });

  if (opts.email) {
    await sendEmail(opts.email, opts.title, `<p>${opts.body || opts.title}</p>`);
  }
}
