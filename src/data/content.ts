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

export type MembershipPriority = {
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

export const membershipWorksSteps: MembershipWorksStep[] = [
  {
    step: "01",
    title: "Apply privately",
    description:
      "Submit your application through private correspondence with the membership desk.",
  },
  {
    step: "02",
    title: "Club membership and background are reviewed",
    description:
      "Standing, conduct, and club affiliation are verified before any next step.",
  },
  {
    step: "03",
    title: "Introductory call",
    description:
      "A brief, confidential conversation to align expectations and fit.",
  },
  {
    step: "04",
    title: "Founding member invitation",
    description:
      "Approved applicants may be invited into the founding member group as the society develops.",
  },
  {
    step: "05",
    title: "Society introductions begin",
    description:
      "Introductions are considered privately by city, club, industry, travel plans, and shared interests.",
  },
];

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Curated introductions",
    description:
      "Connections to accomplished club members—paced, personal, and never public.",
  },
  {
    title: "Connect with purpose",
    description:
      "Align by city, club, industry, travel plans, and shared interests.",
  },
  {
    title: "Travel introductions",
    description:
      "Visiting a new city? Members may meet local members for insight, hospitality, and connection.",
  },
  {
    title: "Opportunity beyond the round",
    description:
      "Golf, hospitality, business relationships, travel connections, and long-term friendships.",
  },
];

export const introductionExamples: MemberBenefit[] = [
  {
    title: "Traveling Abroad",
    description:
      "A member visiting London may meet local members for golf, dining, conversation, and local insight.",
  },
  {
    title: "Business Connections",
    description:
      "Members seeking industry connections may be matched with relevant society members.",
  },
  {
    title: "New Cities",
    description:
      "Members relocating to Palm Beach, New York, Stockholm, or elsewhere may meet established local members.",
  },
  {
    title: "Shared Interests",
    description:
      "Members who share interests in business, investment, philanthropy, entrepreneurship, sport, or other pursuits may be connected.",
  },
];

export const requestIntroductionBullets: string[] = [
  "Visiting a new city",
  "Looking to meet members in a specific industry",
  "Relocating or expanding business operations",
  "Seeking meaningful relationships within the society",
];

export const eliteTeeIsNotItems: string[] = [
  "A tee time marketplace",
  "A public golf booking platform",
  "A club access brokerage",
  "A guaranteed reciprocity program",
  "A social media network",
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

export const membershipPrioritiesLead =
  "EliteTee is a private society—not a public network. These values guide the desk.";

export const membershipPriorities: MembershipPriority[] = [
  {
    title: "Trust",
    description: "Standing is verified before any correspondence begins.",
  },
  {
    title: "Discretion",
    description: "Membership and correspondence remain private.",
  },
  {
    title: "Etiquette",
    description: "Conduct reflects the standards members uphold at home.",
  },
  {
    title: "Curated relationships",
    description: "Relationships are paced and personal—never scaled for volume.",
  },
];

export const memberStandards: string[] = [
  "Active, verifiable membership at a private club recognized by the membership desk.",
  "Access offered in good faith—no reselling, no public brokerage.",
  "Conduct on course, in the clubhouse, and in correspondence—consistent with your home club's standards.",
  "Member details are not published or searchable.",
];

export const navLinks = [
  { href: "#what", label: "Society" },
  { href: "#how-membership-works", label: "Membership" },
  { href: "#standards", label: "Standards" },
  { href: "/about", label: "About Us" },
  { href: "#request", label: "Request" },
];

export const founderClubExperience: string[] = [
  "McArthur Golf Club",
  "Shinnecock Hills Golf Club",
  "National Golf Links of America",
  "Sebonack Golf Club",
  "La Gorce Country Club",
  "Calusa Pines Golf Club",
  "Westhampton Beach Country Club",
];
