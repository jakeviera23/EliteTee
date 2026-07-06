export type DirectoryMember = {
  id: string;
  name: string;
  club: string;
  city: string;
  region: string;
  industry: string;
  bio: string;
};

export const directoryMembers: DirectoryMember[] = [];

export function getDirectoryIndustries(members: DirectoryMember[]) {
  return [...new Set(members.map((member) => member.industry))].sort();
}

export function getDirectoryRegions(members: DirectoryMember[]) {
  return [...new Set(members.map((member) => member.region))].sort();
}
