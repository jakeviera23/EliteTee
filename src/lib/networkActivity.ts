import { parseFeedPostContent } from "./memberFeedPosts";
import {
  fetchDiscoverablePortalMembers,
  fetchOwnMemberProfile,
} from "./memberProfiles";
import { selectMemberHomeRecommendation } from "./memberHome";
import { supabase } from "./supabase";

export type NetworkActivityKind =
  | "comment"
  | "reply"
  | "like"
  | "mention"
  | "course_activity"
  | "travel_match"
  | "game_request"
  | "recommended_member";

export type NetworkActivityItem = {
  id: string;
  kind: NetworkActivityKind;
  typeLabel: string;
  memberName: string;
  description: string;
  createdAt: string;
  countsTowardBadge: boolean;
  feedPostId?: string;
  courseSlug?: string;
  memberTarget?: { userId: string; memberName: string };
  contributionLabel?: string;
};

const NETWORK_ACTIVITY_LIMIT = 24;
const LAST_SEEN_KEY = (userId: string) => `elitetee-network-activity-seen:${userId}`;

function validTimestamp(value: string | null | undefined) {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

export function getLastSeenNetworkActivityAt(userId: string) {
  try {
    const value = localStorage.getItem(LAST_SEEN_KEY(userId));
    return validTimestamp(value) ? value : null;
  } catch {
    return null;
  }
}

export function markNetworkActivitySeen(userId: string, seenAt = new Date().toISOString()) {
  if (!userId.trim() || !validTimestamp(seenAt)) return;
  try {
    localStorage.setItem(LAST_SEEN_KEY(userId), seenAt);
  } catch {
    // Activity remains usable when storage is unavailable.
  }
}

export function isUnseenNetworkActivity(createdAt: string, lastSeenAt: string | null) {
  if (!validTimestamp(createdAt)) return false;
  if (!validTimestamp(lastSeenAt)) return true;
  return Date.parse(createdAt) > Date.parse(lastSeenAt!);
}

function postHeadline(content: string) {
  const parsed = parseFeedPostContent(content);
  return parsed.headline?.trim() || parsed.badge?.trim() || "member update";
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

type ContributionResponseRow = {
  id: unknown;
  post_id: unknown;
  user_id: unknown;
  created_at?: unknown;
};

export function groupNetworkContributionResponses(
  rows: ContributionResponseRow[],
  mentionIds: Set<string>,
  ownPostIds: Set<string>,
) {
  const groups = new Map<
    string,
    { key: string; kind: "comment" | "reply" | "mention"; rows: ContributionResponseRow[] }
  >();

  for (const row of rows) {
    const postId = String(row.post_id);
    const kind = mentionIds.has(String(row.id))
      ? "mention"
      : ownPostIds.has(postId)
        ? "comment"
        : "reply";
    const key = `${kind}:${postId}:${String(row.user_id)}`;
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { key, kind, rows: [row] });
  }

  return [...groups.values()];
}

function opportunityMatchesProfile(
  parsed: ReturnType<typeof parseFeedPostContent>,
  profile: Awaited<ReturnType<typeof fetchOwnMemberProfile>>["data"],
) {
  if (!profile) return false;
  const text = normalize(
    [
      parsed.headline,
      parsed.message,
      ...(parsed.details ?? []).flatMap((detail) => [detail.label, detail.value]),
    ].join(" "),
  );
  const profileSignals = [profile.based_in, profile.traveling_to, ...profile.regions]
    .map(normalize)
    .filter((value) => value.length >= 3);
  return profileSignals.some((signal) => text.includes(signal) || signal.includes(text));
}

export async function fetchNetworkActivityItems({
  currentUserId,
  lastSeenAt,
}: {
  currentUserId: string;
  lastSeenAt: string | null;
}) {
  if (!supabase) {
    return { data: [] as NetworkActivityItem[], error: new Error("Supabase is not configured.") };
  }

  const [profileResult, directoryResult, ownPostsResult, viewerCommentsResult, opportunityResult, ownRoundsResult] =
    await Promise.all([
      fetchOwnMemberProfile(),
      fetchDiscoverablePortalMembers(),
      supabase
        .from("member_feed_posts")
        .select("id, user_id, content, post_type, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("feed_post_comments")
        .select("post_id")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("member_feed_posts")
        .select("id, user_id, content, post_type, created_at")
        .in("post_type", ["traveling", "looking-for-game"])
        .neq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("member_course_rounds")
        .select("golf_course_id")
        .eq("member_user_id", currentUserId)
        .not("golf_course_id", "is", null)
        .limit(100),
    ]);

  const firstError =
    profileResult.error ??
    directoryResult.error ??
    ownPostsResult.error ??
    viewerCommentsResult.error ??
    opportunityResult.error ??
    ownRoundsResult.error;
  if (firstError) return { data: [] as NetworkActivityItem[], error: firstError };

  const profile = profileResult.data;
  const members = directoryResult.data;
  const ownPosts = ownPostsResult.data ?? [];
  const ownPostIds = ownPosts.map((post) => String(post.id));
  const viewerCommentedPostIds = [
    ...new Set((viewerCommentsResult.data ?? []).map((row) => String(row.post_id))),
  ];
  const responsePostIds = [...new Set([...ownPostIds, ...viewerCommentedPostIds])];
  const interestCourseIds = [
    ...new Set([
      ...(profile?.bucket_list_course_ids ?? []),
      ...(ownRoundsResult.data ?? [])
        .map((round) => (round.golf_course_id ? String(round.golf_course_id) : ""))
        .filter(Boolean),
    ]),
  ];

  const firstName = profile?.full_name.trim().split(/\s+/)[0] ?? "";
  const [responsesResult, likesResult, relatedPostsResult, mentionsResult, relatedRoundsResult] =
    await Promise.all([
      responsePostIds.length
        ? supabase
            .from("feed_post_comments")
            .select("id, post_id, user_id, body, created_at")
            .in("post_id", responsePostIds)
            .neq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      ownPostIds.length
        ? supabase
            .from("feed_post_likes")
            .select("id, post_id, user_id, created_at")
            .in("post_id", ownPostIds)
            .neq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      viewerCommentedPostIds.length
        ? supabase
            .from("member_feed_posts")
            .select("id, user_id, content, post_type, created_at")
            .in("id", viewerCommentedPostIds)
        : Promise.resolve({ data: [], error: null }),
      firstName.length >= 2
        ? supabase
            .from("feed_post_comments")
            .select("id, post_id, user_id, body, created_at")
            .ilike("body", `%@${firstName}%`)
            .neq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      interestCourseIds.length
        ? supabase
            .from("member_course_rounds")
            .select("id, member_user_id, golf_course_id, course_name, created_at")
            .in("golf_course_id", interestCourseIds)
            .neq("member_user_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const secondaryError =
    responsesResult.error ??
    likesResult.error ??
    relatedPostsResult.error ??
    mentionsResult.error ??
    relatedRoundsResult.error;
  if (secondaryError) return { data: [] as NetworkActivityItem[], error: secondaryError };

  const allPosts = [...ownPosts, ...(relatedPostsResult.data ?? [])];
  const postById = new Map(allPosts.map((post) => [String(post.id), post]));
  const memberByUserId = new Map(
    members
      .filter((member) => member.user_id)
      .map((member) => [member.user_id!, member]),
  );
  const items: NetworkActivityItem[] = [];
  const mentionIds = new Set((mentionsResult.data ?? []).map((row) => String(row.id)));
  const ownPostIdSet = new Set(ownPostIds);

  const responseGroups = groupNetworkContributionResponses(
    responsesResult.data ?? [],
    mentionIds,
    ownPostIdSet,
  );

  for (const { key: groupKey, kind, rows: comments } of responseGroups) {
    if (!comments || comments.length === 0) continue;
    const comment = comments[0]!;
    const postId = String(comment.post_id);
    const actor = memberByUserId.get(String(comment.user_id));
    const actorName = actor?.full_name || "A member";
    const isMention = kind === "mention";
    const isReply = kind === "reply";
    const createdAt = String(comment.created_at ?? "");
    const headline = postHeadline(String(postById.get(postId)?.content ?? ""));
    const repeated = comments.length;
    items.push({
      id: repeated > 1 ? `${groupKey}:grouped` : `${kind}:${comment.id}`,
      kind,
      typeLabel: isMention ? "Mention" : isReply ? "Reply" : "Comment",
      memberName: actorName,
      description:
        repeated > 1
          ? isMention
            ? `${actorName} mentioned you ${repeated} times in a conversation about ${headline}.`
            : isReply
              ? `${actorName} replied ${repeated} times in a conversation about ${headline}.`
              : `${actorName} left ${repeated} comments on your ${headline} post.`
          : isMention
            ? `${actorName} mentioned you in a conversation about ${headline}.`
            : isReply
              ? `${actorName} replied in a conversation about ${headline}.`
              : `${actorName} commented on your ${headline} post.`,
      createdAt,
      countsTowardBadge: isUnseenNetworkActivity(createdAt, lastSeenAt),
      feedPostId: postId,
      contributionLabel: headline,
    });
  }

  const likesByPost = new Map<string, typeof likesResult.data>();
  for (const like of likesResult.data ?? []) {
    const postId = String(like.post_id);
    const group = likesByPost.get(postId) ?? [];
    group.push(like);
    likesByPost.set(postId, group);
  }
  for (const [postId, likes] of likesByPost) {
    if (!likes || likes.length === 0) continue;
    const latest = likes[0]!;
    const actor = memberByUserId.get(String(latest.user_id));
    const actorName = actor?.full_name || "A member";
    const createdAt = String(latest.created_at ?? "");
    const others = likes.length - 1;
    items.push({
      id: `like:${postId}:${createdAt}`,
      kind: "like",
      typeLabel: "Appreciation",
      memberName: actorName,
      description: `${actorName}${others > 0 ? ` and ${others} ${others === 1 ? "other" : "others"}` : ""} appreciated your ${postHeadline(String(postById.get(postId)?.content ?? ""))} post.`,
      createdAt,
      countsTowardBadge: isUnseenNetworkActivity(createdAt, lastSeenAt),
      feedPostId: postId,
    });
  }

  for (const post of opportunityResult.data ?? []) {
    const parsed = parseFeedPostContent(String(post.content ?? ""));
    const isGame = String(post.post_type) === "looking-for-game";
    if (!isGame && !opportunityMatchesProfile(parsed, profile)) continue;
    const actor = memberByUserId.get(String(post.user_id));
    const actorName = actor?.full_name || "A member";
    const createdAt = String(post.created_at ?? "");
    items.push({
      id: `${isGame ? "game" : "travel"}:${post.id}`,
      kind: isGame ? "game_request" : "travel_match",
      typeLabel: isGame ? "Game request" : "Travel match",
      memberName: actorName,
      description: isGame
        ? `${actorName} is looking for a game near ${parsed.headline || "the network"}.`
        : `${actorName} shared travel plans that overlap with your profile.`,
      createdAt,
      countsTowardBadge: isUnseenNetworkActivity(createdAt, lastSeenAt),
      feedPostId: String(post.id),
    });
  }

  const courseIds = [
    ...new Set((relatedRoundsResult.data ?? []).map((round) => String(round.golf_course_id))),
  ];
  const courseResult = courseIds.length
    ? await supabase.from("golf_courses").select("id, name, slug").in("id", courseIds)
    : { data: [], error: null };
  if (courseResult.error) return { data: [] as NetworkActivityItem[], error: courseResult.error };
  const courseById = new Map((courseResult.data ?? []).map((course) => [String(course.id), course]));
  const seenCourseIds = new Set<string>();
  for (const round of relatedRoundsResult.data ?? []) {
    const courseId = String(round.golf_course_id);
    if (seenCourseIds.has(courseId)) continue;
    seenCourseIds.add(courseId);
    const course = courseById.get(courseId);
    const actor = memberByUserId.get(String(round.member_user_id));
    const actorName = actor?.full_name || "A member";
    const createdAt = String(round.created_at ?? "");
    items.push({
      id: `course:${round.id}`,
      kind: "course_activity",
      typeLabel: "Course activity",
      memberName: actorName,
      description: `${actorName} shared a new experience at ${course?.name || round.course_name}.`,
      createdAt,
      countsTowardBadge: isUnseenNetworkActivity(createdAt, lastSeenAt),
      courseSlug: course?.slug ? String(course.slug) : undefined,
    });
  }

  const recommendation = selectMemberHomeRecommendation(members, profile);
  if (recommendation?.member.user_id) {
    const createdAt = recommendation.member.updated_at;
    items.push({
      id: `recommended-member:${recommendation.member.user_id}`,
      kind: "recommended_member",
      typeLabel: "Recommended member",
      memberName: recommendation.member.full_name,
      description: recommendation.reason
        ? `${recommendation.member.full_name} is worth meeting: ${recommendation.reason}.`
        : `${recommendation.member.full_name} is worth meeting.`,
      createdAt,
      countsTowardBadge: isUnseenNetworkActivity(createdAt, lastSeenAt),
      memberTarget: {
        userId: recommendation.member.user_id,
        memberName: recommendation.member.full_name,
      },
    });
  }

  return {
    data: items
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, NETWORK_ACTIVITY_LIMIT),
    error: null,
  };
}
