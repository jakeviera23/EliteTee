export const PROFILE_HERO_CLASS = {
  cover: "et-profile-hero-cover",
  avatar: "et-profile-hero-avatar",
  identity: "et-profile-identity",
} as const;

export function isProfileIdentityOutsideCover(markup: string): boolean {
  const coverIndex = markup.indexOf(PROFILE_HERO_CLASS.cover);
  const avatarIndex = markup.indexOf(PROFILE_HERO_CLASS.avatar);
  const identityIndex = markup.indexOf(PROFILE_HERO_CLASS.identity);

  if (coverIndex === -1 || avatarIndex === -1 || identityIndex === -1) {
    return false;
  }

  if (!(coverIndex < avatarIndex && avatarIndex < identityIndex)) {
    return false;
  }

  const coverSection = markup.slice(coverIndex, avatarIndex);
  return !coverSection.includes(PROFILE_HERO_CLASS.identity);
}
