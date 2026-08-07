import type { FeedPost } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  buildMatchReasons,
  formatMemberCardContext,
  scoreMemberRelevance,
} from "./discoverDirectory";
import { isCourseRoundPost } from "./feedCardMeta";

const LAST_VISIT_PREFIX = "elitetee_member_home_last_visit";
const EXPOSURE_PREFIX = "elitetee_member_home_exposure";
const MAX_EXPOSURE_ITEMS = 12;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export type MemberHomeActivityDigest = {
  headline: string;
  summary: string;
  postCount: number;
  memberCount: number;
  courseCount: number;
  photoCount: number;
  hasPreviousVisit: boolean;
};

export type MemberHomeRecommendation = {
  member: MemberProfileRecord;
  reason: string | null;
};

export type MemberHomeExposure = {
  postIds: string[];
  memberIds: string[];
};

export type MemberHomePulse = {
  post: FeedPost;
  label: "Open invitation" | "Needs your insight";
  reason: string;
};

export const EMPTY_MEMBER_HOME_EXPOSURE: MemberHomeExposure = {
  postIds: [],
  memberIds: [],
};

export const FOUNDING_MEMBER_EDITORIAL_PROMPTS = [
  "Which course exceeded your expectations most—and why?",
  "What separates a great golf host from a merely generous one?",
  "Which architect’s work did you understand better after playing it?",
  "What is the most memorable invitation you have received through golf?",
  "Where would you send a member for an exceptional three-day golf trip?",
  "Which course deserves more attention from serious golfers?",
  "What is one piece of local knowledge every visiting golfer should know?",
  "Which round changed how you think about golf?",
] as const;

export type MemberHomeCourseSignal = {
  name: string;
  location: string;
  postId: string;
  mentions: number;
};

function lastVisitKey(userId: string) {
  return `${LAST_VISIT_PREFIX}:${userId.trim()}`;
}

function exposureKey(userId: string) {
  return `${EXPOSURE_PREFIX}:${userId.trim()}`;
}

function normalizedIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))]
    .slice(0, MAX_EXPOSURE_ITEMS);
}

export function readMemberHomeExposure(
  userId: string,
  storage: StorageReader,
): MemberHomeExposure {
  if (!userId.trim()) return EMPTY_MEMBER_HOME_EXPOSURE;
  try {
    const parsed = JSON.parse(storage.getItem(exposureKey(userId)) ?? "{}") as Record<string, unknown>;
    return {
      postIds: normalizedIds(parsed.postIds),
      memberIds: normalizedIds(parsed.memberIds),
    };
  } catch {
    return EMPTY_MEMBER_HOME_EXPOSURE;
  }
}

function recordId(current: string[], id: string | undefined) {
  const normalized = id?.trim();
  if (!normalized) return current;
  return [normalized, ...current.filter((item) => item !== normalized)].slice(0, MAX_EXPOSURE_ITEMS);
}

export function recordMemberHomeExposure(
  userId: string,
  exposure: { postId?: string; memberId?: string },
  storage: StorageReader & StorageWriter,
) {
  if (!userId.trim()) return;
  const current = readMemberHomeExposure(userId, storage);
  storage.setItem(
    exposureKey(userId),
    JSON.stringify({
      postIds: recordId(current.postIds, exposure.postId),
      memberIds: recordId(current.memberIds, exposure.memberId),
    }),
  );
}

export function getFoundingMemberEditorialPrompt(date = new Date()) {
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : 0;
  const week = Math.floor(timestamp / (7 * 24 * 60 * 60 * 1000));
  return FOUNDING_MEMBER_EDITORIAL_PROMPTS[week % FOUNDING_MEMBER_EDITORIAL_PROMPTS.length]!;
}

function isValidIsoDate(value: string | null | undefined) {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

export function readMemberHomeLastVisit(userId: string, storage: StorageReader): string | null {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return null;
  const stored = storage.getItem(lastVisitKey(normalizedUserId));
  return isValidIsoDate(stored) ? stored : null;
}

export function writeMemberHomeLastVisit(
  userId: string,
  visitedAt: string,
  storage: StorageWriter,
) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || !isValidIsoDate(visitedAt)) return;
  storage.setItem(lastVisitKey(normalizedUserId), visitedAt);
}

export function buildMemberHomeActivityDigest(
  posts: FeedPost[],
  previousVisitAt: string | null,
): MemberHomeActivityDigest {
  const hasPreviousVisit = isValidIsoDate(previousVisitAt);
  const activity = hasPreviousVisit
    ? posts.filter(
        (post) =>
          isValidIsoDate(post.createdAt) &&
          Date.parse(post.createdAt!) > Date.parse(previousVisitAt!),
      )
    : posts;
  const members = new Set(
    activity.map((post) => post.authorUserId || post.author.id).filter(Boolean),
  );
  const courses = new Set(
    activity
      .filter((post) => isCourseRoundPost(post))
      .map((post) => post.courseName.trim().toLowerCase())
      .filter(Boolean),
  );
  const photoCount = activity.reduce((total, post) => total + post.images.length, 0);

  if (hasPreviousVisit && activity.length === 0) {
    return {
      headline: "You’re caught up.",
      summary:
        "You’re current on new posts. EliteTee has selected one useful conversation for your attention below.",
      postCount: 0,
      memberCount: 0,
      courseCount: 0,
      photoCount: 0,
      hasPreviousVisit: true,
    };
  }

  if (activity.length === 0) {
    return {
      headline: "The next conversation starts with you.",
      summary: "Share a round, a travel plan, or a question for the member network.",
      postCount: 0,
      memberCount: 0,
      courseCount: 0,
      photoCount: 0,
      hasPreviousVisit: false,
    };
  }

  const postLabel = `${activity.length} ${activity.length === 1 ? "update" : "updates"}`;
  const memberLabel = `${members.size} ${members.size === 1 ? "member" : "members"}`;

  return {
    headline: hasPreviousVisit ? `${postLabel} since your last visit.` : "Your member briefing is ready.",
    summary: `${memberLabel} shared ${postLabel}${
      courses.size > 0
        ? ` across ${courses.size} ${courses.size === 1 ? "course" : "courses"}`
        : ""
    }.`,
    postCount: activity.length,
    memberCount: members.size,
    courseCount: courses.size,
    photoCount,
    hasPreviousVisit,
  };
}

export function selectMemberHomeRecommendation(
  members: MemberProfileRecord[],
  viewer: MemberProfileRecord | null,
  seenMemberIds: string[] = [],
): MemberHomeRecommendation | null {
  if (!viewer?.user_id) return null;

  const ranked = members
    .filter((member) => member.user_id && member.user_id !== viewer.user_id)
    .map((member) => ({
      member,
      score: scoreMemberRelevance(viewer, member),
      reasons: buildMatchReasons(viewer, member),
    }))
    .filter((candidate) => candidate.score > 0 && candidate.reasons.length > 0)
    .sort((a, b) => {
      const aSeenIndex = seenMemberIds.indexOf(a.member.user_id ?? "");
      const bSeenIndex = seenMemberIds.indexOf(b.member.user_id ?? "");
      const aIsUnseen = aSeenIndex === -1;
      const bIsUnseen = bSeenIndex === -1;
      if (aIsUnseen !== bIsUnseen) return aIsUnseen ? -1 : 1;
      if (!aIsUnseen && aSeenIndex !== bSeenIndex) return bSeenIndex - aSeenIndex;
      return b.score - a.score || a.member.full_name.localeCompare(b.member.full_name);
    });

  const best = ranked[0];
  return best ? { member: best.member, reason: formatMemberCardContext(viewer, best.member) } : null;
}

function pulsePriority(post: FeedPost) {
  if (isOpportunityPost(post)) return post.comments === 0 ? 300 : 220;
  const signal = `${post.requestLabel ?? ""} ${post.courseName ?? ""}`.toLowerCase();
  if (signal.includes("introduction") || signal.includes("business")) {
    return post.comments === 0 ? 280 : 200;
  }
  if (post.comments === 0) return isCourseRoundPost(post) ? 160 : 180;
  return 0;
}

export function selectMemberHomePulse(
  posts: FeedPost[],
  viewerUserId: string | null,
  seenPostIds: string[] = [],
): MemberHomePulse | null {
  const candidates = posts
    .map((post, index) => ({ post, index, priority: pulsePriority(post) }))
    .filter(({ post, priority }) =>
      priority > 0 &&
      Boolean(post.caption.trim()) &&
      (!viewerUserId || (post.authorUserId || post.author.id) !== viewerUserId),
    )
    .sort((a, b) => {
      const aSeenIndex = seenPostIds.indexOf(a.post.id);
      const bSeenIndex = seenPostIds.indexOf(b.post.id);
      const aIsUnseen = aSeenIndex === -1;
      const bIsUnseen = bSeenIndex === -1;
      if (aIsUnseen !== bIsUnseen) return aIsUnseen ? -1 : 1;
      if (!aIsUnseen && aSeenIndex !== bSeenIndex) return bSeenIndex - aSeenIndex;
      return b.priority - a.priority || a.index - b.index;
    });

  const selected = candidates[0]?.post;
  if (!selected) return null;
  const opportunity = isOpportunityPost(selected) || pulsePriority(selected) >= 200;
  return {
    post: selected,
    label: opportunity ? "Open invitation" : "Needs your insight",
    reason: opportunity
      ? `${selected.author.name} shared a timely request where a direct response could help.`
      : "No member has responded yet. A useful question or piece of experience can move this forward.",
  };
}

function isOpportunityPost(post: FeedPost) {
  const label = `${post.requestLabel ?? ""} ${post.courseName ?? ""}`.toLowerCase();
  return (
    post.postType === "golf-travel" ||
    label.includes("travel") ||
    label.includes("looking for game") ||
    label.includes("looking for a game")
  );
}

export function selectMemberHomeOpportunity(
  posts: FeedPost[],
  viewerUserId: string | null,
) {
  return (
    posts.find(
      (post) =>
        isOpportunityPost(post) &&
        Boolean(post.caption.trim()) &&
        (!viewerUserId || post.authorUserId !== viewerUserId),
    ) ?? null
  );
}

export function selectMemberHomeHighlight(posts: FeedPost[], viewerUserId: string | null) {
  const candidates = posts
    .filter(
      (post) =>
        Boolean(post.caption.trim()) &&
        (!viewerUserId || post.authorUserId !== viewerUserId),
    )
    .map((post, index) => ({
      post,
      score:
        post.comments * 5 +
        post.likes * 3 +
        Math.min(post.images.length, 3) * 2 +
        (post.rating ? 1 : 0) +
        Math.max(0, posts.length - index) * 0.01,
    }))
    .filter((candidate) => candidate.score >= 1)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.post ?? null;
}

export function buildMemberHomeCourseSignals(
  posts: FeedPost[],
  limit = 2,
): MemberHomeCourseSignal[] {
  const byCourse = new Map<string, MemberHomeCourseSignal>();

  for (const post of posts) {
    if (!isCourseRoundPost(post)) continue;
    const name = post.courseName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byCourse.get(key);
    if (existing) {
      existing.mentions += 1;
      continue;
    }
    byCourse.set(key, {
      name,
      location: post.courseLocation.trim(),
      postId: post.id,
      mentions: 1,
    });
  }

  return [...byCourse.values()]
    .sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit));
}
