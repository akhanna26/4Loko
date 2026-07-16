// Server-only Supabase client using service role key.
// BYPASSES row-level security. NEVER import this in client code.
import { createClient } from '@supabase/supabase-js';

const url = 'https://cugjenltmpxqhwjltlil.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required');
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
