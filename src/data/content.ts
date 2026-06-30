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
  "Membership begins with a private application, review, and approval process designed to protect quality and trust.";

export const membershipWorksSteps: MembershipWorksStep[] = [
  {
    step: "01",
    title: "Submit Application",
    description:
      "Complete a private membership request with your golf background, location, profession, and interests.",
  },
  {
    step: "02",
    title: "Private Review",
    description:
      "Applications are reviewed for fit, golf involvement, professional background, and alignment with EliteTee standards.",
  },
  {
    step: "03",
    title: "Membership Approval",
    description:
      "Approved applicants are invited into the founding member group as the initial network develops.",
  },
  {
    step: "04",
    title: "Connection Mapping",
    description:
      "Member background, location, travel habits, and professional interests help identify strong future connections.",
  },
  {
    step: "05",
    title: "Introductions Begin",
    description:
      "Connections are considered by geography, travel plans, business interests, golf background, and shared pursuits.",
  },
];

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Private Member Introductions",
    description:
      "Personally curated introductions to golfers aligned with your interests, business background, location, and travel plans.",
  },
  {
    title: "Expanded Golf Network",
    description:
      "Build relationships beyond your home club and connect with ambitious golfers in new cities and golf communities.",
  },
  {
    title: "Business Relationships",
    description:
      "Meet professionals, founders, executives, and ambitious golfers through trusted member connections.",
  },
  {
    title: "Travel Connections",
    description:
      "Connect with members in cities you visit for golf, business, relocation, or extended stays.",
  },
];

export const introductionExamples: MemberBenefit[] = [
  {
    title: "Business Travel",
    description: "Connect with golfers in the cities where business brings you.",
  },
  {
    title: "Golf Travel",
    description:
      "Meet members in destinations where you want to play, visit, or spend more time.",
  },
  {
    title: "New Cities",
    description:
      "Build trusted relationships when relocating or spending time away from home.",
  },
  {
    title: "Shared Opportunities",
    description:
      "Connect through aligned interests in golf, business, investing, hospitality, and enterprise.",
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
    title: "Trusted Connections",
    description:
      "Meaningful introductions between members handled with privacy and discretion.",
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
  "EliteTee exists for private club golfers who value discretion, trust, and meaningful connection beyond their home club.";

export const memberStandardsLead =
  "EliteTee is built on trust, discretion, etiquette, and quality relationships.";

export const memberStandards: string[] = [
  "Respect for the game, club culture, etiquette, and trusted introductions.",
  "Conduct on and off the course consistent with the standards expected in a private network.",
  "Membership information and correspondence handled with discretion.",
  "Relationships offered in good faith among reviewed members.",
];

export const navLinks = [
  { href: "#society", label: "Society" },
  { href: "#membership", label: "Membership" },
  { href: "#standards", label: "Standards" },
  { href: "/about", label: "About Us" },
  { href: "/inside", label: "Inside EliteTee" },
  { href: "#apply", label: "Apply" },
  { href: "/login", label: "Login", className: "nav-link--login" },
];
