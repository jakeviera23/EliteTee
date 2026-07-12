import type { FeedPost, PortalGolfer } from "./portalSocial";

/**
 * Founder welcome post — the only pre-seeded feed content for early-stage members.
 * Member-created posts are prepended above this in PortalFeed.
 */

const founderAuthor: PortalGolfer = {
  id: "founder-jake-viera",
  name: "Jake Viera",
  handle: "jakeviera",
  location: "",
  homeCourse: "",
  bio: "",
  title: "Founder",
  isVerified: true,
  followers: 0,
  following: 0,
  coursesPlayed: 0,
  roundsPosted: 0,
  countriesPlayed: 0,
  favoriteCourses: [],
};

const founderWelcomeCaption = `Welcome to EliteTee — a private golf society built around meaningful connections.

Share rounds, request introductions, and discover courses through members you trust. Thank you for helping shape what we become.`;

export function getFounderWelcomePost(): FeedPost {
  return {
    id: "founder-welcome",
    postType: "photo",
    author: { ...founderAuthor },
    courseName: "",
    courseLocation: "",
    caption: founderWelcomeCaption,
    images: [],
    imageAlt: "",
    likes: 0,
    comments: 0,
    timestamp: "",
  };
}

/** @deprecated Use getFounderWelcomePost — kept for import compatibility. */
export function getMockFeedPosts(): FeedPost[] {
  return [getFounderWelcomePost()];
}
