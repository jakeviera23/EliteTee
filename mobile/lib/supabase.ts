import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export { isSupabaseConfigured };

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    console.warn(
      "[mobile] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return null;
  }

  try {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn("[mobile] Supabase client failed to initialize.", error);
    return null;
  }
}

export const supabase: SupabaseClient | null = createSupabaseClient();

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase is not configured for the mobile app.");
  }
  return supabase;
}
