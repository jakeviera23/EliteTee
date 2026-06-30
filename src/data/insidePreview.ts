export type SidebarNavItem = {
  id: string;
  label: string;
};

export const portalNavItems: SidebarNavItem[] = [
  { id: "society", label: "Society" },
  { id: "why-elitetee", label: "Why EliteTee" },
  { id: "how-membership-works", label: "How It Works" },
  { id: "member-benefits", label: "Why Members Join" },
  { id: "privacy", label: "Privacy" },
  { id: "apply", label: "Apply" },
];

export const memberAccessLead =
  "Approved members can sign in to access the private EliteTee network.";

export const societyHero = {
  title: "EliteTee Private Member Society",
  text: "An invitation-based private network connecting verified private club members for trusted golf access, private introductions, business relationships, and long-term connection.",
};

export const trustPoints: string[] = [
  "Membership reviewed personally",
  "Club affiliation considered",
  "Private introductions only",
  "Member privacy protected",
];

export const memberBenefitsTitle = "Why Members Join EliteTee";

export const whyEliteTee = {
  title: "Private Clubs Have Always Been Built On Relationships",
  text: "EliteTee extends those relationships beyond a member’s home club. Approved members can discover trusted connections while traveling, request introductions privately, and build meaningful golf and business relationships through a verified network.",
};

export const membershipSteps = [
  {
    step: "01",
    title: "Apply Privately",
    description: "Submit a private membership request.",
  },
  {
    step: "02",
    title: "Verification Process",
    description: "Club affiliation and background are reviewed carefully.",
  },
  {
    step: "03",
    title: "Approved Access",
    description: "Accepted members receive access to the private member network.",
  },
  {
    step: "04",
    title: "Request Introductions",
    description: "Members privately request introductions to aligned members or regions.",
  },
  {
    step: "05",
    title: "Mutual Approval",
    description: "Contact details are shared only after approval.",
  },
];

export const memberBenefits = [
  {
    title: "Golf Access Beyond Your Home Club",
    description: "Trusted introductions while traveling or spending time in new regions.",
  },
  {
    title: "Relationships That Matter",
    description:
      "Build genuine long-term connections with members who share similar standards.",
  },
  {
    title: "Business Through Trust",
    description:
      "Professional relationships can develop naturally through golf, travel, and private member introductions.",
  },
  {
    title: "Private Member Experiences",
    description:
      "Dinners, curated rounds, and regional gatherings as the network grows.",
  },
  {
    title: "A Private Society Built For Decades",
    description:
      "EliteTee is being built deliberately around quality, trust, discretion, and shared standards.",
  },
];

export const privacyTitle = "Built Around Privacy & Discretion";

export const privacyPoints: string[] = [
  "No public member directory",
  "Every application is reviewed individually",
  "Member access is reserved for approved members",
  "Contact details are never publicly visible",
  "Mutual approval is required before introductions",
  "Private club standards are maintained at all times",
];

export const foundingCta = {
  title: "Become A Founding Member",
  text: "EliteTee is privately reviewing a limited number of founding members as the network is built deliberately and without public growth. Membership is granted selectively.",
  button: "Apply For Membership",
};
