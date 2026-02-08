import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for browser-side operations
 * Used for Realtime subscriptions (notifications)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
