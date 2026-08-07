import type { FeedPost } from "../data/portalSocial";

export type ContributionResponseAction = {
  presentation: "bridge" | "compact";
  label: string;
  eyebrow: string;
  explanation: string;
  contextLabel: string;
  draftMessage: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function normalizedPostSignal(post: FeedPost) {
  return `${post.requestLabel ?? ""} ${post.postType} ${post.courseName ?? ""}`.toLowerCase();
}

function conciseContext(post: FeedPost) {
  const primary = post.courseName?.trim() || post.requestLabel?.trim() || "your EliteTee post";
  const location = post.courseLocation?.trim();
  return location ? `${primary} in ${location}` : primary;
}

export function buildContributionResponseAction(
  post: FeedPost,
  viewerUserId: string | null | undefined,
): ContributionResponseAction | null {
  const authorUserId = post.authorUserId?.trim() || post.author.id?.trim();
  if (!authorUserId || !viewerUserId?.trim() || authorUserId === viewerUserId.trim()) return null;

  const signal = normalizedPostSignal(post);
  const authorFirstName = firstName(post.author.name);
  const context = conciseContext(post);

  if (signal.includes("looking for game") || signal.includes("looking-for-game")) {
    return {
      presentation: "bridge",
      label: "I’m interested",
      eyebrow: "Open invitation",
      explanation: `Let ${authorFirstName} know you may be available and coordinate privately.`,
      contextLabel: `Game opportunity · ${context}`,
      draftMessage: `Hi ${authorFirstName} — I saw your Looking for a Game post about ${context}. I’d be interested in joining if the timing works.`,
    };
  }

  if (signal.includes("travel")) {
    return {
      presentation: "bridge",
      label: "Connect on this trip",
      eyebrow: "Travel overlap",
      explanation: "Share local knowledge or see whether your golf plans align.",
      contextLabel: `Travel plan · ${context}`,
      draftMessage: `Hi ${authorFirstName} — I saw your EliteTee travel post about ${context}. I’d be glad to compare plans and help if I can.`,
    };
  }

  if (signal.includes("introduction")) {
    return {
      presentation: "bridge",
      label: "Offer a connection",
      eyebrow: "Member request",
      explanation: "Reach out if you can help with the introduction or point them in the right direction.",
      contextLabel: `Introduction request · ${context}`,
      draftMessage: `Hi ${authorFirstName} — I saw your introduction request about ${context}. I may be able to help or point you toward the right member.`,
    };
  }

  if (signal.includes("business")) {
    return {
      presentation: "bridge",
      label: "Connect privately",
      eyebrow: "Shared opportunity",
      explanation: "Continue the golf and business conversation with the post attached as context.",
      contextLabel: `Business golf · ${context}`,
      draftMessage: `Hi ${authorFirstName} — your EliteTee post about ${context} caught my attention. I’d enjoy continuing the conversation.`,
    };
  }

  if (post.rating !== undefined || signal.includes("course-review") || signal.includes("round review")) {
    return {
      presentation: "compact",
      label: "Ask member",
      eyebrow: "Member knowledge",
      explanation: "Get the details that matter from someone who has played it.",
      contextLabel: `Course experience · ${context}`,
      draftMessage: `Hi ${authorFirstName} — I saw your EliteTee experience at ${context}. I’d love to hear a little more about the course and your round.`,
    };
  }

  return null;
}

export function contributionCommentPlaceholder(post: FeedPost) {
  const signal = normalizedPostSignal(post);
  if (signal.includes("looking for game") || signal.includes("looking-for-game")) {
    return "Share your availability or a helpful lead…";
  }
  if (signal.includes("travel")) return "Share local knowledge or a course recommendation…";
  if (signal.includes("introduction")) return "Offer a helpful connection or suggestion…";
  if (post.rating !== undefined || signal.includes("course-review")) {
    return "Ask about the course or share your experience…";
  }
  return "Add something useful to the conversation…";
}
