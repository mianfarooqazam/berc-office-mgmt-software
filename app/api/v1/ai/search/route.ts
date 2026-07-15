import { getSupabaseAdmin } from "@/lib/supabase";
import { error, json, requireAuth } from "@/lib/api";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  const q = String(body.query || "").trim();

  if (!q) {
    return json({
      status: "coming_soon",
      feature: "smart_search",
      results: [],
      note: "Provide a query. Basic keyword search is available now; semantic AI search is stubbed.",
    });
  }

  const db = getSupabaseAdmin();
  const [employeesRes, documentsRes] = await Promise.all([
    db
      .from("employees")
      .select("id, full_name")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,employee_id.ilike.%${q}%`)
      .limit(5),
    db.from("documents").select("id, title").ilike("title", `%${q}%`).limit(5),
  ]);

  if (employeesRes.error) return error(employeesRes.error.message, 500);
  if (documentsRes.error) return error(documentsRes.error.message, 500);

  return json({
    status: "partial",
    feature: "smart_search",
    note: "Keyword search active. AI semantic ranking coming later.",
    results: {
      employees: (employeesRes.data || []).map((e) => ({
        id: e.id,
        label: e.full_name,
        type: "employee",
      })),
      documents: (documentsRes.data || []).map((d) => ({
        id: d.id,
        label: d.title,
        type: "document",
      })),
    },
  });
}
