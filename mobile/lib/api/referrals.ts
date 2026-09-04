import { requireSupabase } from "../supabase";
import {
  parseMemberReferralInvite,
  parseMemberReferralStats,
} from "../referrals";

export async function fetchMemberReferralInvite() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_or_create_member_referral_code");

  if (error) {
    return { data: null, error };
  }

  return {
    data: parseMemberReferralInvite(data),
    error: null,
  };
}

export async function fetchMemberReferralStats() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_member_referral_stats");

  if (error) {
    return { data: null, error };
  }

  return {
    data: parseMemberReferralStats(data),
    error: null,
  };
}
