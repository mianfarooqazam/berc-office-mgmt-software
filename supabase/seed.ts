import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { DEFAULT_EMPLOYEE_VIEWS, PERMISSIONS, ROLE_PERMISSIONS } from "../lib/permissions";
import { INTEGRATION_PROVIDERS } from "../lib/integrations";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await db.from("company_settings").upsert({
    id: "default",
    name: "BERC",
    legal_name: "BERC Office",
    email: "admin@berc.local",
    phone: "+92-300-0000000",
    address: "Lahore, Pakistan",
    primary_color: "#0F766E",
    accent_color: "#0284C7",
  });

  for (const p of PERMISSIONS) {
    await db.from("permissions").upsert(
      { code: p.code, name: p.name, module: p.module },
      { onConflict: "code" },
    );
  }

  const { data: allPermissions } = await db.from("permissions").select("*");
  const byCode = Object.fromEntries((allPermissions || []).map((p) => [p.code, p.id]));

  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const { data: existing } = await db.from("roles").select("id").eq("name", roleName).maybeSingle();
    let roleId = existing?.id;
    if (!roleId) {
      const { data: created } = await db
        .from("roles")
        .insert({
          name: roleName,
          description:
            roleName === "Admin"
              ? "Full system authority"
              : "Login role — views assigned per user by Admin",
          is_system: true,
        })
        .select("id")
        .single();
      roleId = created!.id;
    }

    await db.from("role_permissions").delete().eq("role_id", roleId);
    if (codes.length) {
      await db.from("role_permissions").insert(
        codes.map((code) => ({
          role_id: roleId!,
          permission_id: byCode[code],
        })),
      );
    }
  }

  for (const provider of INTEGRATION_PROVIDERS) {
    await db.from("integrations").upsert(
      { provider: provider.id, status: "DISCONNECTED" },
      { onConflict: "provider" },
    );
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const year = new Date().getFullYear();

  const { data: roles } = await db.from("roles").select("id, name");
  const roleId = (name: string) => {
    const found = roles!.find((r) => r.name === name);
    if (!found) throw new Error(`Role not found: ${name}`);
    return found.id;
  };

  async function ensureDept(name: string, description: string) {
    const { data: existing } = await db.from("departments").select("id").eq("name", name).maybeSingle();
    if (existing) return existing.id;
    const { data } = await db.from("departments").insert({ name, description }).select("id").single();
    return data!.id;
  }

  const engId = await ensureDept("Engineering", "Product & engineering");
  const hrId = await ensureDept("Human Resources", "People operations");
  const opsId = await ensureDept("Operations", "Office operations");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@berc.local").toLowerCase();
  let { data: adminUser } = await db.from("users").select("id").eq("email", adminEmail).maybeSingle();
  if (!adminUser) {
    const { data: created } = await db
      .from("users")
      .insert({
        email: adminEmail,
        password_hash: adminHash,
        role_id: roleId("Admin"),
      })
      .select("id")
      .single();
    adminUser = created!;
  } else {
    await db
      .from("users")
      .update({ password_hash: adminHash, role_id: roleId("Admin"), is_active: true })
      .eq("id", adminUser.id);
  }

  let { data: adminEmp } = await db
    .from("employees")
    .select("id")
    .eq("employee_id", "BERC-001")
    .maybeSingle();
  if (!adminEmp) {
    const { data: created } = await db
      .from("employees")
      .insert({
        employee_id: "BERC-001",
        full_name: "BERC Admin",
        email: adminEmail,
        phone: "+92-300-0000001",
        designation: "Administrator",
        department_id: opsId,
        joining_date: new Date(`${year}-01-15`).toISOString(),
        status: "ACTIVE",
        user_id: adminUser.id,
      })
      .select("id")
      .single();
    adminEmp = created!;
  }

  await db.from("departments").update({ manager_id: adminEmp.id }).eq("id", engId);
  await db.from("departments").update({ manager_id: adminEmp.id }).eq("id", hrId);

  const holidays = [
    { name: "Pakistan Day", date: `${year}-03-23` },
    { name: "Labour Day", date: `${year}-05-01` },
    { name: "Independence Day", date: `${year}-08-14` },
  ];
  for (const h of holidays) {
    const { data: existing } = await db
      .from("holidays")
      .select("id")
      .eq("name", h.name)
      .maybeSingle();
    if (!existing) {
      await db.from("holidays").insert({ name: h.name, date: new Date(h.date).toISOString() });
    }
  }

  const { count: announcementCount } = await db
    .from("announcements")
    .select("*", { count: "exact", head: true });
  if (!announcementCount) {
    await db.from("announcements").insert({
      title: "Welcome to BERC Office Management",
      body: "Admin creates users from Settings → Users & access and chooses what each person can see.",
      pinned: true,
      author_id: adminUser.id,
    });
  }

  console.log("Supabase seed complete.");
  console.log(`Admin only: ${adminEmail} / ${adminPassword}`);
  console.log("Create more users from Settings → Users & access.");
  console.log("Default employee views:", DEFAULT_EMPLOYEE_VIEWS.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
