import { getSiteUrl } from "@/lib/env";
import {
  ELITETEE_PRIVACY_PATH,
  ELITETEE_TERMS_PATH,
  ELITETEE_TERMS_VERSION,
  type TermsAcceptanceSource,
} from "@/lib/termsOfUse";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function getTermsOfUseUrl(): string {
  return new URL(ELITETEE_TERMS_PATH, getSiteUrl()).toString();
}

export function getPrivacyPolicyUrl(): string {
  return new URL(ELITETEE_PRIVACY_PATH, getSiteUrl()).toString();
}

export async function hasAcceptedCurrentTerms(): Promise<{
  accepted: boolean;
  error: Error | null;
}> {
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
  source: TermsAcceptanceSource = "ios",
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
