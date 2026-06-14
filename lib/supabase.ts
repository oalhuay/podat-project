import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseHost = new URL(supabaseUrl).hostname;
if (!supabaseHost.endsWith(".supabase.co")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL debe apuntar al proyecto de Supabase."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
