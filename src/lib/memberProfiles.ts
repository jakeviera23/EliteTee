import type { MemberProfileInsert, MemberProfileRecord } from "../types/memberProfileRecord";
import { supabase } from "./supabase";

export async function createMemberProfile(record: MemberProfileInsert) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.from("member_profiles").insert(record).select("id").single();

  return { data, error };
}

export async function fetchMemberProfiles() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("is_verified", true)
    .order("full_name", { ascending: true });

  return { data: data as MemberProfileRecord[] | null, error };
}

export function parseListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
