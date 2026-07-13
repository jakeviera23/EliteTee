import { useCallback, useEffect, useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { buildGolferProfileDisplay } from "../../lib/portalProfileDisplay";
import { resolveMemberProfileMedia } from "../../lib/memberProfileMedia";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

export function MemberSnapshotCard() {
  const [display, setDisplay] = useState(() => buildGolferProfileDisplay(null));
  const [profile, setProfile] = useState<MemberProfileRecord | null>(null);

  const loadSnapshot = useCallback(async () => {
    const { data } = await fetchOwnMemberProfile();
    const media = await resolveMemberProfileMedia(data);
    setProfile(data);
    setDisplay(buildGolferProfileDisplay(data, undefined, media));
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  return (
    <article className="portal-snapshot-card" aria-label="Your member snapshot">
      <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>

      <div className="portal-snapshot-head">
        <MemberClubAvatar
          member={{ club_logo_url: profile?.club_logo_url ?? null }}
          name={display.name}
          size="md"
        />
        <div>
          <h3 className="portal-snapshot-name">
            {display.name}
            {display.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
          </h3>
          <p className="portal-snapshot-course">
            {display.homeCourse || "Add your home course in Profile"}
          </p>
        </div>
      </div>

      <dl className="portal-snapshot-stats">
        {display.handicap !== undefined ? (
          <div>
            <dt>Handicap</dt>
            <dd>{display.handicap}</dd>
          </div>
        ) : null}
        <div>
          <dt>Courses saved</dt>
          <dd>{profile?.bucket_list_course_ids.length ?? 0}</dd>
        </div>
        <div>
          <dt>Rounds shared</dt>
          <dd>0</dd>
        </div>
        <div>
          <dt>Connections</dt>
          <dd>0</dd>
        </div>
      </dl>

      <p className="portal-snapshot-note">{earlyStageCopy.memberActivityPending}</p>
    </article>
  );
}
