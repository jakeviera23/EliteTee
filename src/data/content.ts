import { photos } from "../assets/photos";

export type PlatformFeature = {
  id: string;
  title: string;
  description: string;
};

export type MembershipWorksStep = {
  step: string;
  title: string;
  description: string;
};

export type FeatureHero = {
  title: string;
  description: string;
  image: string;
  alt: string;
  objectPosition?: string;
};

export const membershipSocietyLead =
  "EliteTee is a curated golf community where serious golfers share rounds, discover great courses, and build trusted relationships through the game.";

export const platformFeatures: PlatformFeature[] = [
  {
    id: "feed",
    title: "Share Your Rounds",
    description:
      "Post photos, stories, and memorable golf experiences from wherever you play — with golfers who care about the game.",
  },
  {
    id: "discover",
    title: "Discover Great Courses",
    description:
      "Explore courses through member-posted rounds and recommendations as the community grows.",
  },
  {
    id: "community",
    title: "Connect With Serious Golfers",
    description:
      "Follow members, build relationships, and message golfers who share your standards for the game.",
  },
  {
    id: "network",
    title: "Build Trusted Relationships",
    description:
      "Create meaningful connections through golf, travel, and shared experiences — quality over volume.",
  },
];

export const modernGolfer = {
  title: "Quality Over Scale",
  lead: "EliteTee is not trying to be the biggest golf community. It is trying to be the highest-quality one.",
  description:
    "A curated home for serious golfers to share rounds, discover courses, and build trusted relationships — without the noise of mainstream social media.",
};

export const membershipWorksLead =
  "EliteTee is an early-stage curated community. Membership is selective to protect quality, trust, and a golf-first experience for serious golfers.";

export const membershipWorksSteps: MembershipWorksStep[] = [
  {
    step: "01",
    title: "Request Membership",
    description:
      "Tell us where you play, what you love about golf, and why you want to join EliteTee.",
  },
  {
    step: "02",
    title: "Thoughtful Review",
    description:
      "Applications are reviewed to keep the community curated, golf-focused, and welcoming to serious golfers.",
  },
  {
    step: "03",
    title: "Join the Community",
    description:
      "Approved members receive access to share rounds, discover courses, and connect with trusted golfers.",
  },
  {
    step: "04",
    title: "Share & Discover",
    description:
      "Post your rounds and travel, explore courses through shared experiences, and follow golf journeys as members join.",
  },
  {
    step: "05",
    title: "Connect Through Golf",
    description:
      "Build relationships, message members, and find golfers to play with — connection through the game.",
  },
];

export const publicEarlyStageCopy = {
  earlyCommunity: "Early community",
  memberAccessSoon: "Member access opening soon",
  applicationsReviewed: "Applications reviewed thoughtfully",
  activityGrows:
    "A private golf network built around trusted experience, meaningful connections, and the game.",
} as const;

export const featureHeroes: FeatureHero[] = [
  {
    title: "Rounds worth sharing",
    description:
      "Follow golf experiences from members who take the game seriously — rounds, travel, and course discovery as the community grows.",
    image: photos.clubhouseSunsetLuxury,
    alt: "Golfer overlooking a coastal fairway at sunset",
    objectPosition: "center 50%",
  },
  {
    title: "Trust, by design",
    description:
      "Optional verification helps members recognize trusted profiles. Curated membership keeps the community focused on quality.",
    image: photos.clubhouseEveningLuxury,
    alt: "Clubhouse terrace at dusk with warm lighting",
    objectPosition: "center",
  },
];

export const memberStandardsLead =
  "EliteTee is built on respect for the game, authentic sharing, and trusted relationships.";

export const memberStandards: string[] = [
  "Share golf experiences in good faith — rounds, travel, courses, and the culture of the game.",
  "Treat fellow members with the courtesy expected on and off the course.",
  "Optional verification supports trust within a curated community of serious golfers.",
  "Connect to play together and build relationships through shared golf experiences.",
];

export const navLinks = [
  { href: "#society", label: "Society" },
  { href: "#feed-preview", label: "Feed" },
  { href: "#discover-preview", label: "Discover" },
  { href: "#community", label: "Community" },
  { href: "#membership", label: "Membership" },
  { href: "/login", label: "Sign In", className: "nav-link--login" },
];
