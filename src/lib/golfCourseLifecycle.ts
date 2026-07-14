import {
  GOLF_COURSE_LIFECYCLE_STATUSES,
  type GolfCourseLifecycleStatus,
} from "../types/golfCourseImport";

const LEGACY_MODERATION_TO_LIFECYCLE: Record<string, GolfCourseLifecycleStatus> = {
  active: "published",
  pending: "pending_review",
  hidden: "hidden",
};

export function isGolfCourseLifecycleStatus(value: string): value is GolfCourseLifecycleStatus {
  return (GOLF_COURSE_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function mapLegacyModerationStatusToLifecycle(
  moderationStatus: string | null | undefined,
): GolfCourseLifecycleStatus {
  const normalized = moderationStatus?.trim().toLowerCase() ?? "";
  return LEGACY_MODERATION_TO_LIFECYCLE[normalized] ?? "published";
}

export function mapLifecycleStatusToLegacyModeration(
  lifecycleStatus: GolfCourseLifecycleStatus,
): "active" | "pending" | "hidden" {
  switch (lifecycleStatus) {
    case "published":
      return "active";
    case "pending_review":
    case "draft":
      return "pending";
    case "hidden":
      return "hidden";
    default:
      return "active";
  }
}

export function isPublishedGolfCourseLifecycle(
  lifecycleStatus: string | null | undefined,
): boolean {
  return lifecycleStatus === "published";
}
