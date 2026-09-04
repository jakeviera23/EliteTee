import type { MobileMemberProfile } from "@/types/member";
import { isMeaningfulDisplayValue } from "./display";

export type ProfileCompletenessResult = {
  score: number;
  total: number;
  percent: number;
  missingLabels: string[];
  isComplete: boolean;
};

type CompletenessCheck = {
  label: string;
  done: boolean;
};

/**
 * Meaningful profile quality — not every optional field.
 * Own-profile only for coaching prompts.
 */
export function computeProfileCompleteness(
  profile: MobileMemberProfile | null | undefined,
): ProfileCompletenessResult {
  if (!profile) {
    return { score: 0, total: 7, percent: 0, missingLabels: [], isComplete: false };
  }

  const checks: CompletenessCheck[] = [
    {
      label: "profile photo",
      done: Boolean(profile.club_logo_url?.trim()),
    },
    {
      label: "location",
      done: isMeaningfulDisplayValue(profile.based_in),
    },
    {
      label: "home club",
      done: isMeaningfulDisplayValue(profile.primary_club),
    },
    {
      label: "what you're looking for",
      done: isMeaningfulDisplayValue(profile.current_request),
    },
    {
      label: "golf interests",
      done: profile.golf_interests.some(isMeaningfulDisplayValue),
    },
    {
      label: "handicap or travel",
      done:
        isMeaningfulDisplayValue(profile.handicap) ||
        isMeaningfulDisplayValue(profile.traveling_to),
    },
    {
      label: "industry or business interests",
      done:
        isMeaningfulDisplayValue(profile.industry) ||
        profile.business_interests.some(isMeaningfulDisplayValue),
    },
  ];

  const score = checks.filter((check) => check.done).length;
  const total = checks.length;
  const missingLabels = checks.filter((check) => !check.done).map((check) => check.label);
  const percent = Math.round((score / total) * 100);

  return {
    score,
    total,
    percent,
    missingLabels,
    isComplete: missingLabels.length === 0,
  };
}
