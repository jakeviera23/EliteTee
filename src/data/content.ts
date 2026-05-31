import { photos } from "../assets/photos";

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
    title: "Membership Application",
    description:
      "Share your background and club standing through private correspondence.",
  },
  {
    step: "02",
    title: "Standing & Verification",
    description:
      "The desk confirms character and conduct through quiet verification.",
  },
  {
    step: "03",
    title: "Member Introductions",
    description:
      "Introductions are made member to member, with care for fit and trust.",
  },
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
  {
    title: "Trust among peers",
    description: "Relationships grounded in reputation, reciprocity, and shared opportunity.",
    image: photos.teeCloseupLuxury,
    alt: "Hand setting a ball on tee at first light",
    objectPosition: "center 56%",
  },
];

export const membershipPrioritiesLead =
  "EliteTee is a private society for verified members who understand club life. We prioritize trust, relationships, discretion, and opportunity—not public access, open directories, or mass membership.";

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
  { href: "#what", label: "What it is" },
  { href: "#how-membership-works", label: "Access" },
  { href: "#regions", label: "Regions" },
  { href: "#priorities", label: "Priorities" },
  { href: "#standards", label: "Standards" },
  { href: "#request", label: "Request" },
];
