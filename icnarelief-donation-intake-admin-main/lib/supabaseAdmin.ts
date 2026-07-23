import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this into a client component — the service
// role key bypasses RLS entirely. Used only inside API routes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
