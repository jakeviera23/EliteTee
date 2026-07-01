export type RequestType = "Golf Access" | "Business Introduction" | "Travel Networking";

export type MemberRequest = {
  id: string;
  memberName: string;
  requestType: RequestType;
  text: string;
};

export type MemberProfile = {
  id: string;
  name: string;
  city: string;
  regions: string[];
  primaryClub: string;
  additionalClubs: string[];
  industry: string;
  golfInterests: string[];
  businessInterests: string[];
  currentlyLookingFor: string;
  canHostMembersAt: string;
  membershipLabel: "Founding Member" | "Verified Member";
};

export const homeStats = [
  { value: "247", label: "Verified Members" },
  { value: "18", label: "Active Requests" },
  { value: "42", label: "Successful Introductions" },
] as const;

export type HomeOpportunity = {
  id: string;
  category: string;
  text: string;
};

export const homeOpportunities: HomeOpportunity[] = [
  {
    id: "opp-1",
    category: "Golf Access",
    text: "Seeking trusted member introduction at Pine Valley this August.",
  },
  {
    id: "opp-2",
    category: "Business Network",
    text: "Private equity member looking for Palm Beach hospitality connections.",
  },
  {
    id: "opp-3",
    category: "Travel Access",
    text: "Member visiting Scotland seeking reciprocal club introductions.",
  },
];

export const memberRequests: MemberRequest[] = [
  {
    id: "req-1",
    memberName: "M. Reynolds",
    requestType: "Golf Access",
    text: "Traveling to Pinehurst seeking trusted member access.",
  },
  {
    id: "req-2",
    memberName: "M. Reynolds",
    requestType: "Golf Access",
    text: "Traveling to Scotland in September seeking trusted introductions.",
  },
  {
    id: "req-3",
    memberName: "J. Thompson",
    requestType: "Business Introduction",
    text: "Looking for hospitality investment relationships.",
  },
  {
    id: "req-4",
    memberName: "D. Williams",
    requestType: "Business Introduction",
    text: "Looking for members active in private equity.",
  },
  {
    id: "req-5",
    memberName: "T. Collins",
    requestType: "Business Introduction",
    text: "Open to hospitality investment partnerships.",
  },
  {
    id: "req-6",
    memberName: "R. Bennett",
    requestType: "Travel Networking",
    text: "Traveling to California in Q1 seeking West Coast introductions.",
  },
  {
    id: "req-7",
    memberName: "B. Walker",
    requestType: "Travel Networking",
    text: "Seeking discreet introductions across Muskoka and Northeast clubs.",
  },
  {
    id: "req-8",
    memberName: "S. Andersson",
    requestType: "Golf Access",
    text: "Can host approved members at Stockholm clubs.",
  },
  {
    id: "req-9",
    memberName: "D. Williams",
    requestType: "Golf Access",
    text: "Can host approved members at private Midwest clubs.",
  },
  {
    id: "req-10",
    memberName: "A. Carter",
    requestType: "Golf Access",
    text: "Can host members in Scottsdale winter season.",
  },
  {
    id: "req-11",
    memberName: "T. Collins",
    requestType: "Golf Access",
    text: "Seeking London heathland golf introductions.",
  },
  {
    id: "req-12",
    memberName: "J. Thompson",
    requestType: "Golf Access",
    text: "Can host approved members at Seminole.",
  },
];

export const memberProfiles: MemberProfile[] = [
  {
    id: "1",
    name: "J. Thompson",
    city: "Palm Beach, Florida",
    regions: ["South Florida", "Northeast US", "United Kingdom"],
    primaryClub: "Seminole Golf Club",
    additionalClubs: ["National Golf Links", "Bear's Club", "Pine Valley Guest Access"],
    industry: "Private Equity",
    golfInterests: ["Links golf", "Destination golf", "Private club access"],
    businessInterests: ["Real estate investing", "Acquisitions", "Partnerships"],
    currentlyLookingFor: "London introductions September 2026",
    canHostMembersAt: "Palm Beach private clubs",
    membershipLabel: "Founding Member",
  },
  {
    id: "2",
    name: "M. Reynolds",
    city: "Southampton, New York",
    regions: ["Hamptons", "Northeast US", "Scotland"],
    primaryClub: "National Golf Links of America",
    additionalClubs: ["Shinnecock Hills", "Muirfield Guest Access", "Cypress Point Guest Access"],
    industry: "Real Estate",
    golfInterests: ["Links golf", "Coastal clubs", "Classic architecture"],
    businessInterests: ["Hospitality assets", "Club properties", "Development"],
    currentlyLookingFor: "Scotland links introductions fall 2026",
    canHostMembersAt: "Hamptons private club network",
    membershipLabel: "Founding Member",
  },
  {
    id: "3",
    name: "A. Carter",
    city: "Scottsdale, Arizona",
    regions: ["Southwest US", "California", "Mexico"],
    primaryClub: "Desert Forest Golf Club",
    additionalClubs: ["Estancia Club", "Silverleaf", "Los Cabos Resort Access"],
    industry: "Hospitality",
    golfInterests: ["Desert golf", "Resort access", "Member hosting"],
    businessInterests: ["Luxury hospitality", "Club operations", "Partnerships"],
    currentlyLookingFor: "Winter hosting for visiting members",
    canHostMembersAt: "Scottsdale desert clubs",
    membershipLabel: "Founding Member",
  },
  {
    id: "4",
    name: "D. Williams",
    city: "Chicago, Illinois",
    regions: ["Midwest US", "Florida", "Scotland"],
    primaryClub: "Chicago Golf Club",
    additionalClubs: ["Shoreacres", "Midwest Guest Networks", "Pinehurst Access"],
    industry: "Finance",
    golfInterests: ["Private club rounds", "Travel golf", "Competitive play"],
    businessInterests: ["Institutional investing", "Private capital", "Advisory"],
    currentlyLookingFor: "Palm Beach club connections February 2026",
    canHostMembersAt: "Chicago Golf Club and Midwest clubs",
    membershipLabel: "Founding Member",
  },
  {
    id: "5",
    name: "S. Andersson",
    city: "Stockholm, Sweden",
    regions: ["Scandinavia", "United Kingdom", "Continental Europe"],
    primaryClub: "Stockholm Golf Club",
    additionalClubs: ["Ljunghusen", "Royal Dornoch Guest Access", "Sunningdale Guest Access"],
    industry: "Technology",
    golfInterests: ["International travel", "Premium club access", "Hosting members"],
    businessInterests: ["Growth investing", "Founder networks", "Partnerships"],
    currentlyLookingFor: "Members visiting Stockholm summer 2026",
    canHostMembersAt: "Stockholm private clubs",
    membershipLabel: "Verified Member",
  },
  {
    id: "6",
    name: "B. Walker",
    city: "Toronto, Canada",
    regions: ["Muskoka", "Northeast US", "United Kingdom"],
    primaryClub: "Lambton Golf and Country Club",
    additionalClubs: ["National Golf Club of Canada", "Muskoka Bay", "Hamptons Guest Access"],
    industry: "Investment Management",
    golfInterests: ["Summer golf", "Cross-border travel", "Private introductions"],
    businessInterests: ["Asset management", "Family offices", "Long-term capital"],
    currentlyLookingFor: "Discreet Toronto and Muskoka introductions",
    canHostMembersAt: "Toronto and Muskoka clubs",
    membershipLabel: "Verified Member",
  },
  {
    id: "7",
    name: "T. Collins",
    city: "London, England",
    regions: ["United Kingdom", "Continental Europe", "Scotland"],
    primaryClub: "Sunningdale Golf Club",
    additionalClubs: ["Wentworth", "Royal County Down Guest Access", "St Andrews Guest Access"],
    industry: "Private Banking",
    golfInterests: ["Heathland golf", "Heritage clubs", "Member travel"],
    businessInterests: ["Wealth management", "Private client relationships", "Advisory"],
    currentlyLookingFor: "Trusted heathland and links introductions",
    canHostMembersAt: "London heathland club network",
    membershipLabel: "Verified Member",
  },
  {
    id: "8",
    name: "R. Bennett",
    city: "Sydney, Australia",
    regions: ["Australia", "Asia Pacific", "California"],
    primaryClub: "Royal Sydney Golf Club",
    additionalClubs: ["New South Wales Golf Club", "Cypress Point Guest Access", "Pebble Beach Guest Access"],
    industry: "Entrepreneurship",
    golfInterests: ["Asia Pacific golf", "Destination travel", "Society events"],
    businessInterests: ["Founder introductions", "Venture partnerships", "Hospitality"],
    currentlyLookingFor: "West Coast member connections Q1 2026",
    canHostMembersAt: "Sydney private clubs",
    membershipLabel: "Verified Member",
  },
  {
    id: "9",
    name: "K. Yamamoto",
    city: "Tokyo, Japan",
    regions: ["Asia Pacific", "Hawaii", "United Kingdom"],
    primaryClub: "Kasumigaseki Country Club",
    additionalClubs: ["Hirono Golf Club Guest Access", "Royal Melbourne Guest Access", "Wentworth Guest Access"],
    industry: "Hospitality Investments",
    golfInterests: ["Luxury resort golf", "International members", "Trusted referrals"],
    businessInterests: ["Resort development", "Private capital", "Club partnerships"],
    currentlyLookingFor: "UK golf introductions autumn 2026",
    canHostMembersAt: "Tokyo private club network",
    membershipLabel: "Verified Member",
  },
  {
    id: "10",
    name: "R. Henderson",
    city: "Dallas, Texas",
    regions: ["Texas", "Southeast US", "Scotland"],
    primaryClub: "Dallas National Golf Club",
    additionalClubs: ["Caves Valley Guest Access", "Pinehurst Access", "Muirfield Guest Access"],
    industry: "Energy Investments",
    golfInterests: ["Business golf", "Regional introductions", "Links travel"],
    businessInterests: ["Energy private equity", "Infrastructure", "Partnerships"],
    currentlyLookingFor: "Scotland member introductions September 2026",
    canHostMembersAt: "Dallas private clubs",
    membershipLabel: "Verified Member",
  },
];

export const privacyCopy =
  "Member identities and contact details are never publicly visible. Contact information is released only after mutual approval.";

export const memberDossier = {
  name: "J. Thompson",
  membershipStatus: "Founding Member",
  primaryClub: "Seminole Golf Club",
  location: "Palm Beach, Florida",
  industry: "Private Equity",
  businessInterests: ["Private Equity", "Real Estate Investing", "Acquisitions"],
  availableRegions: ["South Florida", "Northeast US", "United Kingdom"],
  currentRequest: "London introductions September 2026",
} as const;
