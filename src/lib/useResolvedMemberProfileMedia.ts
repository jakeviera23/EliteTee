import { useEffect, useState } from "react";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import { resolveMemberProfileMedia } from "./memberProfileMedia";

export function useResolvedMemberProfileMedia(
  profile: Pick<MemberProfileRecord, "cover_photo_url" | "club_logo_url"> | null,
) {
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!profile) {
      setCoverImageUrl(null);
      setAvatarImageUrl(null);
      return () => {
        active = false;
      };
    }

    void resolveMemberProfileMedia(profile).then((media) => {
      if (!active) return;
      setCoverImageUrl(media.coverImageUrl);
      setAvatarImageUrl(media.avatarImageUrl);
    });

    return () => {
      active = false;
    };
  }, [profile?.cover_photo_url, profile?.club_logo_url]);

  return { coverImageUrl, avatarImageUrl };
}
