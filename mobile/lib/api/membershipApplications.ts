import {
  buildMembershipApplicationPayload,
  type MembershipApplicationForm,
} from "../membershipApplication";
import { requireSupabase } from "../supabase";

/**
 * Public insert into membership_applications (RLS: anon/authenticated may insert
 * only with status = 'pending_review'). No portal account is created; admins
 * review and invite from the existing approval workflow.
 */
export async function submitMembershipApplication(form: MembershipApplicationForm) {
  const client = requireSupabase();
  const payload = buildMembershipApplicationPayload(form);

  // No .select(): applicants cannot read applications back under RLS.
  const { error } = await client.from("membership_applications").insert(payload);

  if (error) {
    console.warn("[membership_applications] mobile insert failed", {
      code: error.code,
      message: error.message,
    });
    return { error };
  }

  return { error: null };
}
