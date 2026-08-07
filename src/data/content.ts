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

export type MemberStandard = {
  title: string;
  description: string;
};

export const insideEliteTeeLead =
  "The member platform for rounds, courses, introductions, and private messaging.";

export const homeEditorialQuote = "Golf has always been about who you meet along the way.";

export const standardsBandTitle = "Built around the game.";

export const memberStandards: MemberStandard[] = [
  {
    title: "Respect the game",
    description: "Honor the courses, culture, and traditions of golf.",
  },
  {
    title: "Share honestly",
    description: "Post rounds and travel in good faith.",
  },
  {
    title: "Build real relationships",
    description: "Find people worth playing with.",
  },
];

export type WhyGolfersJoinCard = {
  id: string;
  title: string;
  description: string;
};

export type MembershipJourneyStep = {
  step: string;
  title: string;
  description: string;
};

export type SocialProofItem = {
  id: string;
  label: string;
  detail: string;
};

export const whyGolfersJoinLead =
  "Four ways members get more from golf — beyond the scorecard and the scroll.";

export const whyGolfersJoinCards: WhyGolfersJoinCard[] = [
  {
    id: "share",
    title: "Share Your Rounds",
    description:
      "Post photos and stories from the courses you play — with members who understand the game.",
  },
  {
    id: "discover",
    title: "Discover Great Courses",
    description:
      "Explore destinations through member reviews, ratings, and firsthand round histories.",
  },
  {
    id: "connect",
    title: "Connect With Serious Golfers",
    description:
      "Find members by club, location, travel plans, and the interests you actually share.",
  },
  {
    id: "relationships",
    title: "Build Trusted Relationships",
    description:
      "Request introductions, message privately, and find partners for your next round.",
  },
];

export const membershipJourneyLead =
  "Membership is selective to protect quality and keep the experience golf-first.";

export const membershipJourneySteps: MembershipJourneyStep[] = [
  {
    step: "01",
    title: "Request membership",
    description: "Tell us where you play and why you want to join.",
  },
  {
    step: "02",
    title: "Thoughtful review",
    description: "Applications are reviewed to maintain a curated community.",
  },
  {
    step: "03",
    title: "Join the network",
    description: "Get access to the feed, courses, discover, and messaging.",
  },
  {
    step: "04",
    title: "Play and connect",
    description: "Share rounds, find games, and build trusted relationships.",
  },
];

export const socialProofItems: SocialProofItem[] = [
  { id: "curated", label: "Curated membership", detail: "Selective by design" },
  { id: "golf-first", label: "Golf-first community", detail: "Built around the game" },
  { id: "trust", label: "Trusted connections", detail: "Quality over volume" },
  { id: "private", label: "Private network", detail: "Members only" },
];

export const navLinks = [
  { href: "#product", label: "Inside EliteTee" },
  { href: "#apply", label: "Membership" },
  { href: "/login", label: "Sign In", className: "nav-link--login" },
];

export const navApplyLink = {
  href: "#apply",
  label: "Request Membership",
  className: "nav-link--apply",
};
