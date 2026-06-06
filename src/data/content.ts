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
    title: "Approval and member profile",
    description:
      "Approved members receive a private profile within the society.",
  },
  {
    step: "05",
    title: "Curated introductions begin",
    description:
      "Introductions are made member to member—by city, club, industry, and shared interests.",
  },
];

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Curated introductions",
    description:
      "Introductions to accomplished private club members—paced, personal, and never public.",
  },
  {
    title: "Connect with purpose",
    description:
      "Align by city, club, industry, travel plans, and shared interests.",
  },
  {
    title: "Travel introductions",
    description:
      "Visiting a new city? Members may be introduced to trusted local members who can provide insight, hospitality, and meaningful connections.",
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
      "A member visiting London may be introduced to approved local members for golf, dining, conversation, and local insight.",
  },
  {
    title: "Business Connections",
    description:
      "Members seeking introductions within a specific industry may be connected with relevant members of the society.",
  },
  {
    title: "New Cities",
    description:
      "A member relocating to Palm Beach, New York, Stockholm, or another city may receive introductions to members already established there.",
  },
  {
    title: "Shared Interests",
    description:
      "Introductions may be made between members who share interests in business, investment, philanthropy, entrepreneurship, sport, or other pursuits.",
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
    description: "Member-to-member connections, handled with discretion.",
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
  "EliteTee is a private society of accomplished club members where golf serves as the common ground for trusted relationships, introductions, travel, and opportunity. We prioritize trust, relationships, discretion, and opportunity—not public access, open directories, or mass membership.";

export const membershipPrioritiesNote =
  "Eligibility is decided privately: the desk reviews club membership, background, and conduct before any introduction. Reciprocity is never guaranteed—EliteTee coordinates relationships, not access to courses or tee times. There is no public waitlist, open directory, or scale-first membership model.";

export const membershipPriorities: MembershipPriority[] = [
  {
    title: "Trust",
    description:
      "Standing is confirmed before any introduction. Relationships begin with verification, not visibility.",
  },
  {
    title: "Discretion",
    description:
      "Membership and correspondence stay private. There is no searchable roster or promotional showcase.",
  },
  {
    title: "Etiquette",
    description:
      "Conduct on course and in the clubhouse reflects the customs members already uphold at home.",
  },
  {
    title: "Curated relationships",
    description:
      "Introductions are paced and personal—member to member—never scaled for volume or public enrollment.",
  },
];

export const memberStandards: string[] = [
  "Active, verifiable membership at a private club recognized by the membership desk.",
  "Access offered in good faith—no reselling, no public brokerage of introductions.",
  "Discretion on course, in the clubhouse, and in correspondence.",
  "Introductions are personal; member details are not published or searchable.",
  "Conduct consistent with your home club’s standards for guests and fellow members.",
];

export const navLinks = [
  { href: "#what", label: "Society" },
  { href: "#how-membership-works", label: "Membership" },
  { href: "#standards", label: "Standards" },
  { href: "#request", label: "Request" },
];
