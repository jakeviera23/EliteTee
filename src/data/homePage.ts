export type HomeFeatureBlock = {
  id: string;
  title: string;
  description: string;
};

export type HomeInsidePreview = {
  id: string;
  label: string;
  src: string;
  alt: string;
};

export type HomeEarlyPoint = {
  id: string;
  title: string;
  description: string;
};

export const homeHeroCopy = {
  eyebrow: "Private golf network",
  title: "Golf is better through the right people.",
  description:
    "EliteTee is a curated network for serious golfers to share rounds, discover courses, meet relevant members, and build relationships through the game.",
  primaryCta: "Request Membership",
  signIn: "Sign In",
  trustLine: "Early member community · Applications reviewed individually",
};

export const homeWhatEliteTeeDoes = {
  title: "A network built around golf.",
  intro:
    "EliteTee brings the parts of golf that normally happen through word of mouth into one private member network.",
  features: [
    {
      id: "share",
      title: "Share rounds",
      description:
        "Post where you've played, what stood out, and what other members should know.",
    },
    {
      id: "discover",
      title: "Discover courses",
      description:
        "Explore member-reviewed courses, ratings, destinations, and firsthand experiences.",
    },
    {
      id: "meet",
      title: "Meet golfers",
      description:
        "Find members by club, location, travel plans, golf interests, and shared experience.",
    },
    {
      id: "connect",
      title: "Connect privately",
      description:
        "Request introductions or continue conversations directly through private messaging.",
    },
  ] satisfies HomeFeatureBlock[],
};

const insidePreviewBase = "/images/homepage/inside";

export const homeInsideEliteTee = {
  title: "Inside EliteTee",
  intro:
    "A private member network built around rounds, courses, introductions, and meaningful golf connections.",
  previews: [
    {
      id: "home",
      label: "Home",
      src: `${insidePreviewBase}/inside-home.png`,
      alt: "EliteTee Home member portal (marketing preview)",
    },
    {
      id: "discover",
      label: "Discover",
      src: `${insidePreviewBase}/inside-discover.png`,
      alt: "EliteTee Discover member directory (marketing preview)",
    },
    {
      id: "ask",
      label: "Ask EliteTee",
      src: `${insidePreviewBase}/inside-ask.png`,
      alt: "EliteTee Ask EliteTee concierge (marketing preview)",
    },
    {
      id: "courses",
      label: "Courses",
      src: `${insidePreviewBase}/inside-courses.png`,
      alt: "EliteTee Courses library (marketing preview)",
    },
    {
      id: "introductions",
      label: "Introductions",
      src: `${insidePreviewBase}/inside-introductions.png`,
      alt: "EliteTee Introductions (marketing preview)",
    },
    {
      id: "create",
      label: "Create",
      src: `${insidePreviewBase}/inside-create.png`,
      alt: "EliteTee Create menu (marketing preview)",
    },
  ] satisfies HomeInsidePreview[],
};

export const homeWhyItExists = {
  title: "Golf still runs on relationships.",
  body: "The best rounds, trips, introductions, and opportunities in golf often happen through people you trust. EliteTee brings those relationships into one private network without becoming another noisy social platform.",
  supporting: "Quality of membership matters more than scale.",
};

export const homeEarlyNetwork = {
  title: "Built carefully from the beginning.",
  points: [
    {
      id: "curated",
      title: "Curated membership",
      description:
        "Applications are reviewed to keep the network relevant, trusted, and golf-first.",
    },
    {
      id: "contributions",
      title: "Member-led",
      description:
        "Rounds, course experiences, recommendations, and conversations come from the community.",
    },
    {
      id: "relationships",
      title: "Relationships over reach",
      description:
        "EliteTee is designed around useful golf connections, not follower counts or engagement farming.",
    },
  ] satisfies HomeEarlyPoint[],
};

export const homeCtaCopy = {
  title: "Join the early EliteTee network.",
  description:
    "Join a private golf network being built around better rounds, trusted connections, and the people you meet through the game.",
  button: "Request Membership",
  signIn: "Sign In",
};

export const membershipApplicationIntro = {
  title: "Request Membership",
  body: "Tell us where you play, what you enjoy about golf, and what you hope to find through the network.",
};
