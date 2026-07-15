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
    <div className="relative flex min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_oklab,var(--brand)_18%,transparent),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_color-mix(in_oklab,var(--accent)_14%,transparent),_transparent_45%)]" />
      <div className="relative hidden w-[46%] flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)]/70 p-10 backdrop-blur md:flex">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--brand-fg)] shadow-sm">
            B
          </div>
          <p className="mt-8 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand)]">
            BERC
          </p>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--muted-fg)]">
            A clean workspace for tasks, reports, meetings, assets, and everyday office operations.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-[var(--muted-fg)]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            Role-based access for Admin, HR, Managers, and Employees
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            Built for teams of 20–30 with room to grow
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
          <div className="mb-8 md:hidden">
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--brand)]">
              BERC
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-[var(--muted-fg)]">Use your work email to continue</p>
          <p className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs text-[var(--muted-fg)]">
            Demo: <span className="font-medium text-[var(--fg)]">admin@berc.local</span> /{" "}
            <span className="font-medium text-[var(--fg)]">Admin@123</span>
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--muted-fg)]">
            <Link href="/forgot-password" className="font-medium text-[var(--brand)] hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
