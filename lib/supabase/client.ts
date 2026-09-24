import { createBrowserClient } from '@supabase/ssr';

// Client used in the browser (React components). Relies on the
// authenticated user's session, so it respects the row-level-security
// policies set up in the database (only logged-in users can read/write).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
