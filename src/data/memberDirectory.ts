export type DirectoryMember = {
  id: string;
  name: string;
  club: string;
  city: string;
  region: string;
  industry: string;
  bio: string;
};

export const directoryMembers: DirectoryMember[] = [
  {
    id: "1",
    name: "James Whitmore",
    club: "Maidstone Club",
    city: "New York",
    region: "Northeast",
    industry: "Private Equity",
    bio: "Founding partner focused on long-hold investments. Hosts a small number of members each season with an emphasis on discretion.",
  },
  {
    id: "2",
    name: "Catherine Ashford",
    club: "Seminole Golf Club",
    city: "Palm Beach",
    region: "Southeast",
    industry: "Real Estate",
    bio: "Develops hospitality and residential projects along the Atlantic corridor. Known for thoughtful introductions within the society.",
  },
  {
    id: "3",
    name: "William Harcourt",
    club: "Muirfield",
    city: "Edinburgh",
    region: "United Kingdom",
    industry: "Asset Management",
    bio: "Stewards capital for families with generational club ties. Values reciprocity and quiet correspondence before any introduction.",
  },
  {
    id: "4",
    name: "Margaret Ellison",
    club: "Los Angeles Country Club",
    city: "Los Angeles",
    region: "West",
    industry: "Law",
    bio: "Counsel to institutions and members navigating private club governance. Active host during spring and early summer.",
  },
  {
    id: "5",
    name: "Henry Cartwright",
    club: "National Golf Links of America",
    city: "Southampton",
    region: "Northeast",
    industry: "Family Office",
    bio: "Oversees a single-family office with interests in conservation and club stewardship. Prefers paced, member-to-member dialogue.",
  },
  {
    id: "6",
    name: "Diana Morales",
    club: "Dallas National Golf Club",
    city: "Dallas",
    region: "Southwest",
    industry: "Energy",
    bio: "Leads strategy for a privately held energy group. Connects members seeking standing in Texas private club culture.",
  },
  {
    id: "7",
    name: "Robert Keene",
    club: "Royal Melbourne Golf Club",
    city: "Melbourne",
    region: "Asia-Pacific",
    industry: "Investment Banking",
    bio: "Advises on cross-border transactions with a personal network across heathland and parkland clubs. Travels selectively.",
  },
  {
    id: "8",
    name: "Amelia Foster",
    club: "Cypress Point Club",
    city: "Pebble Beach",
    region: "West",
    industry: "Technology",
    bio: "Built and exited two enterprise software firms. Hosts members who appreciate coastal golf and understated hospitality.",
  },
];

export function getDirectoryIndustries(members: DirectoryMember[]): string[] {
  return [...new Set(members.map((m) => m.industry))].sort();
}

export function getDirectoryRegions(members: DirectoryMember[]): string[] {
  return [...new Set(members.map((m) => m.region))].sort();
}
