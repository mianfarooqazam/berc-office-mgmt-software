import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../lib/permissions";
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
    email: "hr@berc.local",
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
        .insert({ name: roleName, description: `${roleName} role`, is_system: true })
        .select("id")
        .single();
      roleId = created!.id;
    }

    await db.from("role_permissions").delete().eq("role_id", roleId);
    await db.from("role_permissions").insert(
      codes.map((code) => ({
        role_id: roleId!,
        permission_id: byCode[code],
      })),
    );
  }

  for (const provider of INTEGRATION_PROVIDERS) {
    await db.from("integrations").upsert(
      { provider: provider.id, status: "DISCONNECTED" },
      { onConflict: "provider" },
    );
  }

  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const passwordHash = await bcrypt.hash(password, 10);
  const year = new Date().getFullYear();

  const { data: roles } = await db.from("roles").select("id, name");
  const roleId = (name: string) => roles!.find((r) => r.name === name)!.id;

  async function ensureDept(name: string, description: string) {
    const { data: existing } = await db.from("departments").select("id").eq("name", name).maybeSingle();
    if (existing) return existing.id;
    const { data } = await db.from("departments").insert({ name, description }).select("id").single();
    return data!.id;
  }

  const engId = await ensureDept("Engineering", "Product & engineering");
  const hrId = await ensureDept("Human Resources", "People operations");
  const opsId = await ensureDept("Operations", "Office operations");

  async function ensureUserEmployee(opts: {
    email: string;
    roleName: string;
    employeeId: string;
    fullName: string;
    designation: string;
    departmentId?: string;
  }) {
    let { data: user } = await db.from("users").select("id").eq("email", opts.email).maybeSingle();
    if (!user) {
      const { data: created } = await db
        .from("users")
        .insert({
          email: opts.email,
          password_hash: passwordHash,
          role_id: roleId(opts.roleName),
        })
        .select("id")
        .single();
      user = created!;
    }

    let { data: employee } = await db
      .from("employees")
      .select("id")
      .eq("employee_id", opts.employeeId)
      .maybeSingle();

    if (!employee) {
      const { data: created } = await db
        .from("employees")
        .insert({
          employee_id: opts.employeeId,
          full_name: opts.fullName,
          email: opts.email,
          phone: "+92-300-1111111",
          designation: opts.designation,
          department_id: opts.departmentId || null,
          joining_date: new Date(`${year}-01-15`).toISOString(),
          status: "ACTIVE",
          user_id: user.id,
          cnic: "00000-0000000-0",
          address: "Lahore",
          emergency_contact: "+92-300-2222222",
          bank_details: JSON.stringify({ bank: "HBL", account: "0123456789" }),
        })
        .select("id")
        .single();
      employee = created!;
    }

    return { userId: user.id, employeeId: employee.id };
  }

  const admin = await ensureUserEmployee({
    email: process.env.SEED_ADMIN_EMAIL || "admin@berc.local",
    roleName: "Administrator",
    employeeId: "BERC-001",
    fullName: "System Administrator",
    designation: "Administrator",
    departmentId: opsId,
  });

  const hrUser = await ensureUserEmployee({
    email: "hr@berc.local",
    roleName: "Office Manager",
    employeeId: "BERC-002",
    fullName: "Ayesha Khan",
    designation: "HR Manager",
    departmentId: hrId,
  });

  const mgr = await ensureUserEmployee({
    email: "manager@berc.local",
    roleName: "Department Manager",
    employeeId: "BERC-003",
    fullName: "Hassan Ali",
    designation: "Engineering Manager",
    departmentId: engId,
  });

  await db.from("departments").update({ manager_id: mgr.employeeId }).eq("id", engId);
  await db.from("departments").update({ manager_id: hrUser.employeeId }).eq("id", hrId);

  for (let i = 4; i <= 12; i++) {
    await ensureUserEmployee({
      email: `employee${i}@berc.local`,
      roleName: "Employee",
      employeeId: `BERC-${String(i).padStart(3, "0")}`,
      fullName: `Employee ${i}`,
      designation: i % 2 === 0 ? "Software Engineer" : "Operations Associate",
      departmentId: i % 2 === 0 ? engId : opsId,
    });
  }

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
      .eq("date", new Date(h.date).toISOString())
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
      body: "Tasks and Reports are the focus. Connect Google Drive, Meet, and Teams from Integrations.",
      pinned: true,
      author_id: admin.userId,
    });
  }

  const { count: taskCount } = await db.from("tasks").select("*", { count: "exact", head: true });
  if (!taskCount) {
    const { data: t1 } = await db
      .from("tasks")
      .insert({
        title: "Prepare weekly operations report",
        description: "Compile task progress and asset status for leadership.",
        priority: "HIGH",
        status: "IN_PROGRESS",
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        created_by_id: admin.userId,
      })
      .select("id")
      .single();
    await db.from("task_assignees").insert({ task_id: t1!.id, employee_id: mgr.employeeId });
    await db.from("task_activities").insert({ task_id: t1!.id, message: "Task seeded for demo" });

    const { data: t2 } = await db
      .from("tasks")
      .insert({
        title: "Review onboarding checklist",
        description: "Ensure new hire documents are complete.",
        priority: "MEDIUM",
        status: "TODO",
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        created_by_id: hrUser.userId,
      })
      .select("id")
      .single();
    await db.from("task_assignees").insert({ task_id: t2!.id, employee_id: hrUser.employeeId });
    await db.from("task_activities").insert({ task_id: t2!.id, message: "Task seeded for demo" });
  }

  console.log("Supabase seed complete.");
  console.log(`Admin: ${process.env.SEED_ADMIN_EMAIL || "admin@berc.local"} / ${password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
