import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoSupabase, isDemoMode } from "./demo";

let admin: SupabaseClient | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add your Supabase project keys to .env (see .env.example).`,
    );
  }
  return value;
}

/** Server-side Supabase client (service role). Demo stub when keys are not set. */
export function getSupabaseAdmin() {
  if (isDemoMode()) {
    return createDemoSupabase() as unknown as SupabaseClient;
  }

  if (admin) return admin;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return admin;
}

export type Db = ReturnType<typeof getSupabaseAdmin>;
export { isDemoMode };
