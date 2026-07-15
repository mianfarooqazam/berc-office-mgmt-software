import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel, toSnake } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { getDemoCompany, updateDemoCompany } from "@/lib/demo-store";
import { z } from "zod";

export async function GET() {
  const { error: authError } = await requirePermission("settings.read");
  if (authError) return authError;

  if (isDemoMode()) {
    return json(getDemoCompany());
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("company_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

const schema = z.object({
  name: z.string().optional(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export async function PATCH(req: Request) {
  const { error: authError, user } = await requirePermission("settings.write");
  if (authError || !user) return authError!;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  if (isDemoMode()) {
    const updated = updateDemoCompany(parsed.data);
    await writeAudit(user.id, "UPDATE", "CompanySettings", "default");
    return json(updated);
  }

  const db = getSupabaseAdmin();
  const updates = toSnake(parsed.data as Record<string, unknown>);

  const { data: existing } = await db
    .from("company_settings")
    .select("id")
    .eq("id", "default")
    .maybeSingle();

  let settings;
  if (existing) {
    const { data, error: dbError } = await db
      .from("company_settings")
      .update(updates)
      .eq("id", "default")
      .select()
      .single();
    if (dbError) return error(dbError.message, 500);
    settings = data;
  } else {
    const { data, error: dbError } = await db
      .from("company_settings")
      .insert({
        id: "default",
        name: parsed.data.name || "BERC",
        ...updates,
      })
      .select()
      .single();
    if (dbError) return error(dbError.message, 500);
    settings = data;
  }

  await writeAudit(user.id, "UPDATE", "CompanySettings", "default");
  return json(toCamel(settings));
}
