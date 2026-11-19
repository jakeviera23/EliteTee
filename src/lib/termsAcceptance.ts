import {
  ELITETEE_TERMS_VERSION,
  type TermsAcceptanceSource,
} from "./termsOfUse";
import { isSupabaseConfigured, supabase } from "./supabase";

export type TermsAcceptanceState = {
  accepted: boolean;
  error: Error | null;
};

export async function hasAcceptedCurrentTerms(): Promise<TermsAcceptanceState> {
  if (!isSupabaseConfigured || !supabase) {
    return { accepted: false, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("has_accepted_elitetee_terms", {
    p_terms_version: ELITETEE_TERMS_VERSION,
  });

  if (error) {
    return { accepted: false, error };
  }

  return { accepted: Boolean(data), error: null };
}

export async function acceptCurrentTerms(
  source: TermsAcceptanceSource = "web",
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: new Error("Supabase is not configured.") };
  }

  const { error } = await supabase.rpc("accept_elitetee_terms", {
    p_terms_version: ELITETEE_TERMS_VERSION,
    p_source: source,
  });

  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}
