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
      "Share your details and golf background through private correspondence.",
  },
  {
    step: "02",
    title: "Club & Background Verification",
    description:
      "The desk confirms standing and conduct through quiet verification.",
  },
  {
    step: "03",
    title: "Introductions & Access Coordination",
    description:
      "Introductions are coordinated member to member with club customs in mind.",
  },
];

export const featureHeroes: FeatureHero[] = [
  {
    title: "Quiet introductions",
    description: "Private member-to-member connections, handled with discretion.",
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
    title: "Travel with standing",
    description: "For members who move between clubs with reputation already intact.",
    image: photos.teeCloseupLuxury,
    alt: "Hand setting a ball on tee at first light",
    objectPosition: "center 56%",
  },
];

export const membershipPrioritiesLead =
  "Elite Tee exists for verified members who understand private club culture. We prioritize trust, discretion, etiquette, and curated relationships—not public access, open directories, or mass membership.";

export const membershipPriorities: MembershipPriority[] = [
  {
    title: "Trust",
    description:
      "Standing is confirmed before any introduction. Relationships begin with verification, not visibility.",
  },
  {
    title: "Discretion",
    description:
      "Travel and correspondence stay private. There is no searchable roster or promotional member showcase.",
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
  "Hosting and travel offered in good faith with respect for club customs.",
  "Discretion on course, in the clubhouse, and in correspondence.",
  "Conduct consistent with your home club’s standards for guests and fellow members.",
];



export const navLinks = [
  { href: "#what", label: "What it is" },
  { href: "#how-membership-works", label: "Access" },
  { href: "#regions", label: "Regions" },
  { href: "#standards", label: "Standards" },
  { href: "#request", label: "Request" },
];
