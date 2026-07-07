export type SidebarNavItem = {
  id: string;
  label: string;
};

export const portalNavItems: SidebarNavItem[] = [
  { id: "society", label: "Society" },
  { id: "why-elitetee", label: "Why EliteTee" },
  { id: "how-membership-works", label: "How It Works" },
  { id: "privacy", label: "Privacy" },
  { id: "apply", label: "Apply" },
];

export const memberAccessLead =
  "Sign in to share your rounds, discover courses, and connect with serious golfers inside EliteTee.";

export const societyHero = {
  title: "EliteTee Society",
  text: "A curated golf community where serious golfers share rounds, discover great courses, and build trusted relationships through the game.",
};

export const trustPoints: string[] = [
  "Curated golf community",
  "Thoughtful membership review",
  "Optional profile verification",
  "Trusted member experiences",
];

export const whyEliteTee = {
  title: "The Highest-Quality Golf Community",
  text: "EliteTee gives serious golfers a curated place to share rounds, discover courses, message members, and build trusted relationships — with optional verification for added trust.",
};

export const membershipSteps = [
  {
    step: "01",
    title: "Request Membership",
    description: "Apply to join the curated EliteTee community.",
  },
  {
    step: "02",
    title: "Thoughtful Review",
    description: "Applications are reviewed to protect quality and a golf-first experience.",
  },
  {
    step: "03",
    title: "Member Sign In",
    description: "Approved golfers receive access to share, discover, and connect.",
  },
  {
    step: "04",
    title: "Share & Discover",
    description: "Post rounds and travel, explore courses through trusted member experiences.",
  },
  {
    step: "05",
    title: "Connect Through Golf",
    description: "Build relationships and message golfers who share your love for the game.",
  },
];

export const privacyTitle = "Built Around Trust & Quality";

export const privacyPoints: string[] = [
  "Profiles and messaging designed for members, not the open web",
  "Every application is reviewed individually",
  "Optional verification supports trust within a curated community",
  "Contact details are never publicly visible",
  "Mutual consent before member messaging",
  "Respect for the game and fellow golfers at all times",
];

export const foundingCta = {
  title: "Request Membership",
  text: "EliteTee is a curated early community for serious golfers. Request membership to share rounds, discover courses, and connect as the community grows.",
  button: "Request Membership",
};
