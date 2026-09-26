import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
