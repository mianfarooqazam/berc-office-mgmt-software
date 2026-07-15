import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import {
  addDemoReportLink,
  isDemoDriveConnected,
  listDemoIntegrations,
  listDemoReportLinks,
  removeDemoReportLink,
} from "@/lib/demo-store";
import { z } from "zod";

async function driveConnected() {
  if (isDemoMode()) return isDemoDriveConnected();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("integrations")
    .select("status")
    .eq("provider", "GOOGLE_DRIVE")
    .maybeSingle();
  return data?.status === "CONNECTED";
}

export async function GET() {
  const { error: authError } = await requirePermission("reports.read");
  if (authError) return authError;

  const connected = await driveConnected();

  if (isDemoMode()) {
    const drive = listDemoIntegrations().find((i) => i.provider === "GOOGLE_DRIVE");
    return json({
      drive: {
        connected,
        accountEmail: drive?.accountEmail || null,
        connectedAt: drive?.connectedAt || null,
      },
      links: listDemoReportLinks(),
    });
  }

  const db = getSupabaseAdmin();
  const [{ data: drive }, { data: links, error: linksError }] = await Promise.all([
    db.from("integrations").select("*").eq("provider", "GOOGLE_DRIVE").maybeSingle(),
    db
      .from("report_links")
      .select("*, created_by:users(email, employee:employees(full_name))")
      .order("created_at", { ascending: false }),
  ]);
  if (linksError) return error(linksError.message, 500);

  const driveCamel = toCamel<{
    status?: string;
    accountEmail?: string | null;
    connectedAt?: string | null;
  } | null>(drive);

  return json({
    drive: {
      connected: driveCamel?.status === "CONNECTED",
      accountEmail: driveCamel?.accountEmail || null,
      connectedAt: driveCamel?.connectedAt || null,
    },
    links: toCamel(links || []),
  });
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  reportType: z.string().optional().nullable(),
  driveUrl: z.string().url(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("reports.read");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(createSchema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const connected = await driveConnected();
  if (!connected) {
    return error("Connect Google Drive first (Integrations or Reports hub).", 400);
  }

  if (isDemoMode()) {
    const link = addDemoReportLink({
      ...parsed.data,
      createdById: user.id,
    });
    await writeAudit(user.id, "CREATE", "ReportLink", link.id);
    return json(link, 201);
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("report_links")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      report_type: parsed.data.reportType ?? null,
      drive_url: parsed.data.driveUrl,
      created_by_id: user.id,
    })
    .select()
    .single();
  if (dbError) return error(dbError.message, 500);
  const result = toCamel<{ id: string }>(data);
  await writeAudit(user.id, "CREATE", "ReportLink", result.id);
  return json(result, 201);
}

export async function DELETE(req: Request) {
  const { error: authError, user } = await requirePermission("reports.read");
  if (authError || !user) return authError!;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return error("id is required", 400);

  if (isDemoMode()) {
    removeDemoReportLink(id);
    await writeAudit(user.id, "DELETE", "ReportLink", id);
    return json({ ok: true });
  }

  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("report_links").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "ReportLink", id);
  return json({ ok: true });
}
