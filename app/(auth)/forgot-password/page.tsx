"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api<{ message: string; resetToken?: string }>("/api/v1/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      setMessage(res.message);
      if (res.resetToken) setToken(res.resetToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--brand)_14%,transparent),_transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--brand)]">BERC</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-fg)]">
          We will email a reset link if the account exists.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {message}
            </div>
          ) : null}
          {token ? (
            <p className="break-all text-xs text-[var(--muted-fg)]">
              Dev token:{" "}
              <Link className="text-[var(--brand)] underline" href={`/reset-password?token=${token}`}>
                use reset link
              </Link>
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
