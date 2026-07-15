import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import {
  addDemoReportLink,
  isDemoDriveConnected,
} from "@/lib/demo-store";

type Ctx = { params: Promise<{ type: string }> };

const REPORT_META: Record<string, { title: string; category: string }> = {
  tasks: { title: "Task detail report", category: "operations" },
  "task-summary": { title: "Task summary", category: "operations" },
  meetings: { title: "Meetings report", category: "work" },
  employees: { title: "Employee directory", category: "people" },
  assets: { title: "Assets inventory", category: "resources" },
  departments: { title: "Departments report", category: "people" },
  announcements: { title: "Announcements archive", category: "work" },
  documents: { title: "Documents index", category: "resources" },
};

export async function POST(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("reports.read");
  if (authError || !user) return authError!;

  const { type } = await ctx.params;
  const meta = REPORT_META[type];
  if (!meta) return error("Unknown report type", 404);

  const connected = isDemoMode()
    ? isDemoDriveConnected()
    : (
        await getSupabaseAdmin()
          .from("integrations")
          .select("status")
          .eq("provider", "GOOGLE_DRIVE")
          .maybeSingle()
      ).data?.status === "CONNECTED";

  if (!connected) {
    return error("Connect Google Drive before saving reports to Drive.", 400);
  }

  // Demo / local: store a Drive-style link. With real OAuth, replace with Drive API upload.
  const stamp = new Date().toISOString().slice(0, 10);
  const driveUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(`BERC ${meta.title} ${stamp}`)}`;

  if (isDemoMode()) {
    const link = addDemoReportLink({
      title: `${meta.title} — ${stamp}`,
      description: "Saved from BERC Reports hub (demo Drive link).",
      category: meta.category,
      reportType: type,
      driveUrl,
      createdById: user.id,
    });
    await writeAudit(user.id, "CREATE", "ReportLink", link.id, { type, destination: "GOOGLE_DRIVE" });
    return json({ link, mode: "demo" }, 201);
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("report_links")
    .insert({
      title: `${meta.title} — ${stamp}`,
      description: "Linked from BERC Reports hub. Open Drive to view or upload the exported file.",
      category: meta.category,
      report_type: type,
      drive_url: driveUrl,
      created_by_id: user.id,
    })
    .select()
    .single();
  if (dbError) return error(dbError.message, 500);

  const link = toCamel(data);
  await writeAudit(user.id, "CREATE", "ReportLink", (link as { id: string }).id, {
    type,
    destination: "GOOGLE_DRIVE",
  });
  return json({ link, mode: "linked" }, 201);
}
