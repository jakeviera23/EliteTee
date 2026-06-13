import { photos } from "../assets/photos";

export type MemberBenefit = {
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
  /** Fine-tunes crop for warm, club-oriented editorial framing. */
  objectPosition?: string;
};

export const membershipWorksLead =
  "Members join to meet like-minded golfers, connect while traveling, and build relationships with people who share their respect for the game.";

export const membershipWorksSteps: MembershipWorksStep[] = [
  {
    step: "01",
    title: "Apply privately",
    description: "Submit your application to the membership desk.",
  },
  {
    step: "02",
    title: "Review",
    description: "Background, golf experience, and character are verified privately.",
  },
  {
    step: "03",
    title: "Introductory call",
    description: "A brief conversation to align expectations and fit.",
  },
  {
    step: "04",
    title: "Founding member invitation",
    description: "Approved applicants may join the founding member group as the society develops.",
  },
  {
    step: "05",
    title: "Introductions begin",
    description: "Connections are considered by city, golf, industry, travel, and shared interests.",
  },
];

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Trusted introductions",
    description: "Meet accomplished golfers through personal, private correspondence.",
  },
  {
    title: "Golf and travel",
    description: "Connect with members in cities you visit or places you spend time.",
  },
  {
    title: "Business relationships",
    description: "Build professional connections with golfers who share your standards.",
  },
  {
    title: "Shared experiences",
    description: "Golf, hospitality, and long-term friendships across business and travel.",
  },
];

export const introductionExamples: MemberBenefit[] = [
  {
    title: "Traveling abroad",
    description: "Meet local members for golf, dining, and conversation in a new city.",
  },
  {
    title: "Business",
    description: "Connect with members in your industry or area of interest.",
  },
  {
    title: "New cities",
    description: "Build your circle when relocating or spending extended time away from home.",
  },
  {
    title: "Shared pursuits",
    description: "Meet members with aligned interests in sport, investment, philanthropy, or enterprise.",
  },
];

export const requestIntroductionBullets: string[] = [
  "Visiting a new city",
  "Meeting members in your industry",
  "Relocating or spending time in a new market",
  "Building relationships within the society",
];

export const featureHeroes: FeatureHero[] = [
  {
    title: "Quiet introductions",
    description: "Member-to-member connections, handled privately.",
    image: photos.clubhouseSunsetLuxury,
    alt: "Clubhouse terrace overlooking coastal course at sunset",
    objectPosition: "center 50%",
  },
  {
    title: "Golf culture",
    description: "Standing, etiquette, and respect for the game and those who play it.",
    image: photos.clubhouseEveningLuxury,
    alt: "Clubhouse exterior at dusk with warm interior lighting",
    objectPosition: "center 45%",
  },
];

export const membershipSocietyLead =
  "EliteTee exists to help ambitious golfers expand their circle through meaningful introductions, shared golf experiences, and golf, business, and travel relationships.";

export const memberStandardsLead =
  "EliteTee is built on trust, discretion, etiquette, and quality relationships.";

export const memberStandards: string[] = [
  "Commitment to the game, etiquette, and the standards expected within a trusted golf network.",
  "Conduct on course and in company consistent with the respect EliteTee members expect.",
  "Membership and correspondence handled with discretion.",
  "Relationships offered in good faith among vetted members.",
];

export const navLinks = [
  { href: "#what", label: "Society" },
  { href: "#how-membership-works", label: "Membership" },
  { href: "#standards", label: "Standards" },
  { href: "/about", label: "About Us" },
  { href: "#request", label: "Request" },
];
