import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let company: { name?: string; primaryColor?: string; accentColor?: string } | null = {
    name: "BERC",
    primaryColor: "#0F766E",
    accentColor: "#0284C7",
  };
  let unread = 0;

  if (!isDemoMode()) {
    const db = getSupabaseAdmin();
    const [companyRes, unreadRes] = await Promise.all([
      db.from("company_settings").select("*").eq("id", "default").maybeSingle(),
      db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    company = toCamel<{
      name?: string;
      primaryColor?: string;
      accentColor?: string;
    } | null>(companyRes.data) || company;
    unread = unreadRes.count ?? 0;
  }

  const brand = company?.primaryColor || "#0F766E";
  const accent = company?.accentColor || "#0284C7";

  return (
    <AppShell
      companyName={company?.name || "BERC"}
      userName={user.employee?.fullName || user.email}
      unread={unread}
    >
      <style>{`
        :root { --brand: ${brand}; --accent: ${accent}; --brand-fg: #ffffff; }
        .dark { --brand: #2dd4bf; --accent: #38bdf8; --brand-fg: #042f2e; }
      `}</style>
      {children}
    </AppShell>
  );
}
