import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cugjenltmpxqhwjltlil.supabase.co';
const supabaseAnonKey = 'sb_publishable_mai5svs2oUaVF4TjPZ_OZg_8F-xPGx9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);