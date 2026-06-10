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
    description: "Club membership, standing, and background are verified.",
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
    description: "Connections are considered by city, club, industry, travel, and shared interests.",
  },
];

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Trusted introductions",
    description: "Meet accomplished club members through personal, private correspondence.",
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
    description: "Golf, hospitality, and long-term friendships beyond your home club.",
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
    alt: "Private clubhouse terrace overlooking coastal course at sunset",
    objectPosition: "center 50%",
  },
  {
    title: "Club culture",
    description: "Standing, etiquette, and respect for private ground.",
    image: photos.clubhouseEveningLuxury,
    alt: "Private clubhouse exterior at dusk with warm interior lighting",
    objectPosition: "center 45%",
  },
];

export const membershipSocietyLead =
  "EliteTee exists to help club golfers expand their circle through meaningful introductions, shared golf experiences, and business relationships.";

export const memberStandardsLead =
  "EliteTee is built on trust, discretion, etiquette, and quality relationships.";

export const memberStandards: string[] = [
  "Active membership at a private club recognized by the membership desk.",
  "Conduct on course and in the clubhouse consistent with your home club.",
  "Membership and correspondence handled with discretion.",
  "Relationships offered in good faith among verified members.",
];

export const navLinks = [
  { href: "#what", label: "Society" },
  { href: "#how-membership-works", label: "Membership" },
  { href: "#standards", label: "Standards" },
  { href: "/about", label: "About Us" },
  { href: "#request", label: "Request" },
];
