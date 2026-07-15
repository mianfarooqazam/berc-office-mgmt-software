"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@berc.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/login", { method: "POST", json: { email, password } });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_oklab,var(--brand)_16%,transparent),_transparent_52%),radial-gradient(ellipse_at_bottom_right,_color-mix(in_oklab,var(--accent)_12%,transparent),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative hidden w-[48%] flex-col justify-between border-r border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_78%,transparent)] p-12 backdrop-blur-xl md:flex">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] font-[family-name:var(--font-display)] text-xl font-bold text-[var(--brand-fg)] shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,var(--shadow-md)]">
            B
          </div>
          <p className="mt-10 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--brand)]">
            BERC
          </p>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted-fg)]">
            A professional workspace for tasks, reports, meetings, assets, and everyday office
            operations.
          </p>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm">
            <p className="font-semibold text-[var(--foreground)]">Role-based access</p>
            <p className="mt-1 text-[var(--muted-fg)]">
              Admin, HR, Managers, and Employees with clear permissions
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm">
            <p className="font-semibold text-[var(--foreground)]">Built for growing teams</p>
            <p className="mt-1 text-[var(--muted-fg)]">Designed for offices of 20–30 people</p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="ui-soft-in w-full max-w-md rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)] md:p-9">
          <div className="mb-8 md:hidden">
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--brand)]">
              BERC
            </p>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted-fg)]">Use your work email to continue</p>
          <p className="mt-3 rounded-xl border border-[var(--brand)]/15 bg-[var(--brand)]/5 px-3.5 py-2.5 text-xs text-[var(--muted-fg)]">
            Demo:{" "}
            <span className="font-semibold text-[var(--foreground)]">admin@berc.local</span> /{" "}
            <span className="font-semibold text-[var(--foreground)]">Admin@123</span>
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="ui-label">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="ui-label">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted-fg)]">
            <Link href="/forgot-password" className="font-semibold text-[var(--brand)] hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
