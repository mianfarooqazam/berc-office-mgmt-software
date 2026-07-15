import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, requirePermission } from "@/lib/api";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";

type Ctx = { params: Promise<{ type: string }> };

async function getRows(type: string) {
  const db = getSupabaseAdmin();

  switch (type) {
    case "tasks": {
      const { data, error: dbError } = await db
        .from("tasks")
        .select(
          "*, assignees:task_assignees(*, employee:employees(*)), created_by:users!tasks_created_by_id_fkey(*, employee:employees(*)), comments:task_comments(count), attachments:task_attachments(count)",
        )
        .order("status")
        .order("due_date");
      if (dbError) throw new Error(dbError.message);

      const rows = toCamel<
        {
          title: string;
          priority: string;
          status: string;
          dueDate?: string | null;
          assignees: { employee: { fullName: string } }[];
          createdBy: { employee?: { fullName?: string } | null; email: string };
          comments?: { count: number }[];
          attachments?: { count: number }[];
        }[]
      >(data || []);

      return {
        headers: [
          "Title",
          "Priority",
          "Status",
          "Due",
          "Assignees",
          "Created By",
          "Comments",
          "Attachments",
        ],
        data: rows.map((r) => [
          r.title,
          r.priority,
          r.status,
          r.dueDate ? String(r.dueDate).slice(0, 10) : "",
          r.assignees.map((a) => a.employee.fullName).join(", "),
          r.createdBy.employee?.fullName || r.createdBy.email,
          String(r.comments?.[0]?.count ?? 0),
          String(r.attachments?.[0]?.count ?? 0),
        ]),
      };
    }
    case "task-summary": {
      const [todoRes, inProgressRes, completedRes, highRes] = await Promise.all([
        db.from("tasks").select("*", { count: "exact", head: true }).eq("status", "TODO"),
        db.from("tasks").select("*", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
        db.from("tasks").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),
        db
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("priority", "HIGH")
          .neq("status", "COMPLETED"),
      ]);
      const todo = todoRes.count ?? 0;
      const inProgress = inProgressRes.count ?? 0;
      const completed = completedRes.count ?? 0;
      const high = highRes.count ?? 0;
      return {
        headers: ["Metric", "Count"],
        data: [
          ["To Do", String(todo)],
          ["In Progress", String(inProgress)],
          ["Completed", String(completed)],
          ["Open High Priority", String(high)],
          ["Total", String(todo + inProgress + completed)],
        ],
      };
    }
    case "employees": {
      const { data, error: dbError } = await db
        .from("employees")
        .select("*, department:departments(*)")
        .order("full_name");
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          employeeId: string;
          fullName: string;
          email: string;
          department?: { name?: string } | null;
          designation?: string | null;
          status: string;
        }[]
      >(data || []);
      return {
        headers: ["Employee ID", "Name", "Email", "Department", "Designation", "Status"],
        data: rows.map((r) => [
          r.employeeId,
          r.fullName,
          r.email,
          r.department?.name || "",
          r.designation || "",
          r.status,
        ]),
      };
    }
    case "assets": {
      const { data, error: dbError } = await db
        .from("assets")
        .select("*, assigned_to:employees!assets_assigned_to_id_fkey(*)")
        .order("asset_id");
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          assetId: string;
          name: string;
          category: string;
          assignedTo?: { fullName?: string } | null;
          status: string;
        }[]
      >(data || []);
      return {
        headers: ["Asset ID", "Name", "Category", "Assigned To", "Status"],
        data: rows.map((r) => [
          r.assetId,
          r.name,
          r.category,
          r.assignedTo?.fullName || "",
          r.status,
        ]),
      };
    }
    case "departments": {
      const { data, error: dbError } = await db
        .from("departments")
        .select("*, manager:employees!departments_manager_id_fkey(*), employees(count)")
        .order("name");
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          name: string;
          manager?: { fullName?: string } | null;
          employees?: { count: number }[];
        }[]
      >(data || []);
      return {
        headers: ["Name", "Manager", "Employees"],
        data: rows.map((r) => [
          r.name,
          r.manager?.fullName || "",
          String(r.employees?.[0]?.count ?? 0),
        ]),
      };
    }
    case "meetings": {
      const { data, error: dbError } = await db
        .from("meetings")
        .select("*, participants:meeting_participants(*, employee:employees(*))")
        .order("starts_at", { ascending: false });
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          title: string;
          platform?: string | null;
          startsAt: string;
          endsAt: string;
          participants: { employee: { fullName: string } }[];
          meetingUrl?: string | null;
        }[]
      >(data || []);
      return {
        headers: ["Title", "Platform", "Starts", "Ends", "Participants", "Join URL"],
        data: rows.map((r) => [
          r.title,
          r.platform || "",
          r.startsAt,
          r.endsAt,
          r.participants.map((p) => p.employee.fullName).join(", "),
          r.meetingUrl || "",
        ]),
      };
    }
    case "announcements": {
      const { data, error: dbError } = await db
        .from("announcements")
        .select("*, author:users(*, employee:employees(*))")
        .order("published_at", { ascending: false });
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          title: string;
          pinned: boolean;
          publishedAt: string;
          author: { employee?: { fullName?: string } | null; email: string };
        }[]
      >(data || []);
      return {
        headers: ["Title", "Pinned", "Published", "Author"],
        data: rows.map((r) => [
          r.title,
          r.pinned ? "Yes" : "No",
          r.publishedAt,
          r.author.employee?.fullName || r.author.email,
        ]),
      };
    }
    case "documents": {
      const { data, error: dbError } = await db
        .from("documents")
        .select("*, folder:document_folders(*)")
        .order("name");
      if (dbError) throw new Error(dbError.message);
      const rows = toCamel<
        {
          name: string;
          folder?: { name?: string } | null;
          createdAt?: string;
        }[]
      >(data || []);
      return {
        headers: ["Name", "Folder", "Created"],
        data: rows.map((r) => [r.name, r.folder?.name || "", r.createdAt || ""]),
      };
    }
    default:
      return null;
  }
}

export async function GET(req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("reports.read");
  if (authError) return authError;

  const { type } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") || "excel";

  let report: Awaited<ReturnType<typeof getRows>>;
  try {
    report = await getRows(type);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Report failed", 500);
  }
  if (!report) return error("Unknown report type", 404);

  if (format === "pdf") {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`BERC Report: ${type}`, 14, 16);
    doc.setFontSize(9);
    let y = 26;
    doc.text(report.headers.join(" | "), 14, y);
    y += 6;
    for (const row of report.data) {
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      doc.text(row.join(" | ").slice(0, 110), 14, y);
      y += 5;
    }
    const buffer = Buffer.from(doc.output("arraybuffer"));
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type);
  sheet.addRow(report.headers);
  report.data.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
    },
  });
}
