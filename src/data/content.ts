import { photos } from "../assets/photos";

export type HostRegion = {
  name: string;
  area: string;
  note: string;
};

export type WorksStep = {
  step: string;
  text: string;
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
};

export const eliteTeeWorksSteps: WorksStep[] = [
  {
    step: "01",
    text: "Members request introductions to trusted clubs and players.",
  },
  {
    step: "02",
    text: "Elite Tee coordinates discreet connections and travel experiences.",
  },
  {
    step: "03",
    text: "Members enjoy curated golf relationships worldwide.",
  },
];

export const featureHeroes: FeatureHero[] = [
  {
    title: "On the walk",
    description:
      "Fairways at first light—the rhythm members know from their home clubs.",
    image: photos.heroAerial,
    alt: "Aerial view of sand bunkers on a private fairway at golden hour",
  },
  {
    title: "Club grounds",
    description:
      "Stone clubhouses, verandas, and the quiet customs of private institutions.",
    image: photos.heroClubhouse,
    alt: "Clubhouse and grounds overlooking the course",
  },
  {
    title: "Between rounds",
    description:
      "Woodland corridors, long shadows, and time reserved for the next introduction.",
    image: photos.heroSwing,
    alt: "Golfer in follow-through beneath a dramatic sky",
  },
];

export const hostRegions: HostRegion[] = [
  {
    name: "Northeast Club",
    area: "United States · Northeast",
    note: "Seasonal hosting among members with standing at established private clubs.",
  },
  {
    name: "South Florida Club",
    area: "United States · Florida",
    note: "Winter circuits and reciprocal-style visits arranged member to member.",
  },
  {
    name: "London Heathland Club",
    area: "United Kingdom",
    note: "Heathland and parkland introductions for members traveling on business or holiday.",
  },
  {
    name: "Scandinavian Coastal Club",
    area: "Nordic region",
    note: "Coastal and links-adjacent clubs represented by verified hosts—not open listings.",
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
  "Hosting and travel offered in good faith—no green fees resold, no public tee-time brokerage.",
  "Discretion on course, in the clubhouse, and in correspondence.",
  "Introductions are personal; member details are not published or searchable.",
  "Conduct consistent with your home club’s standards for guests and fellow members.",
];

export const navLinks = [
  { href: "#what", label: "What it is" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#regions", label: "Regions" },
  { href: "#priorities", label: "Priorities" },
  { href: "#standards", label: "Standards" },
  { href: "#request", label: "Request" },
];

export const regionsHero = {
  image: photos.heroSunset,
  alt: "Putting green at sunset on private ground",
};
