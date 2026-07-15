import { clearSessionCookie, getSession } from "@/lib/auth";
import { json, writeAudit } from "@/lib/api";

export async function POST() {
  const session = await getSession();
  await clearSessionCookie();
  if (session) await writeAudit(session.userId, "LOGOUT", "User", session.userId);
  return json({ ok: true });
}
