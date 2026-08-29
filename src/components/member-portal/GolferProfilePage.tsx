import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import {
  loadBucketListCourseSummaries,
  type BucketListCourseSummary,
} from "../../lib/bucketListCourses";
import { fetchMemberFeedPostsForCurrentUser, fetchMemberFeedPostsForUser } from "../../lib/memberFeedPosts";
import {
  fetchMemberCourseRoundsForCurrentUser,
  fetchMemberCourseRoundsForUser,
} from "../../lib/memberCourseRounds";
import {
  fetchApprovedMemberProfileByUserId,
  fetchOwnMemberProfile,
} from "../../lib/memberProfiles";
import { hydrateBucketListCourseIds } from "../../lib/portalCourseState";
import {
  buildGolferProfileDisplay,
  isMeaningfulProfileText,
  partitionProfileDisplayItems,
} from "../../lib/portalProfileDisplay";
import {
  buildProfileExperienceStats,
  buildUniqueCoursesPlayed,
  PROFILE_FEED_ACTIVITY_LIMIT,
  PROFILE_RECENT_EXPERIENCE_LIMIT,
} from "../../lib/profilePageDisplay";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { migrateLegacyPortalProfileExtrasIfNeeded } from "../../lib/portalProfileExtras";
import { useResolvedMemberProfileMedia } from "../../lib/useResolvedMemberProfileMedia";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { MemberActivityList } from "./MemberActivityList";
import { ProfileCover } from "./ProfileCover";
import { ProfileDossier } from "./ProfileDossier";
import { ProfileBucketList } from "./profile/ProfileBucketList";
import { ProfileCoursesPlayed } from "./profile/ProfileCoursesPlayed";
import { ProfileFeedActivityList } from "./profile/ProfileFeedActivityList";
import { ProfileMemberAvatar } from "./profile/ProfileMemberAvatar";
import { ProfileProsePreview } from "./profile/ProfileProsePreview";
import { ProfileTagOrTextList } from "./profile/ProfileTagOrTextList";
import { VerifiedBadge } from "./VerifiedBadge";
import { InviteGolfer } from "./InviteGolfer";

function ProfileEmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="et-profile-empty">
      <p className="et-profile-empty-title">{title}</p>
      <p className="et-profile-empty-copy">{hint}</p>
    </div>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="et-profile-section">
      <header className="et-profile-section-head">
        <h3 className="et-profile-section-title">{title}</h3>
        {description ? <p className="et-profile-section-lead">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function formatJoinedDate(value: string | undefined) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

type GolferProfilePageProps = {
  isActive: boolean;
  viewUserId?: string | null;
  onBack?: () => void;
  backLabel?: string;
  onMessageMember?: (userId: string, memberName: string) => void;
  onRequestIntroduction?: (member: MemberProfileRecord) => void;
  onViewMemberProfile?: (userId: string, memberName: string) => void;
  onOpenFeedPost?: (postId: string) => void;
};

export function GolferProfilePage({
  isActive,
  viewUserId = null,
  onBack,
  backLabel = "Back",
  onMessageMember,
  onRequestIntroduction,
  onViewMemberProfile: _onViewMemberProfile,
  onOpenFeedPost,
}: GolferProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfileRecord | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [courseRounds, setCourseRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [bucketListCourses, setBucketListCourses] = useState<BucketListCourseSummary[]>([]);
  const [isBucketListLoading, setIsBucketListLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resolvedViewUserId = viewUserId?.trim() || null;
  const isViewingOther = Boolean(resolvedViewUserId && resolvedViewUserId !== currentUserId);
  const { coverImageUrl, avatarImageUrl } = useResolvedMemberProfileMedia(memberProfile);

  useEffect(() => {
    if (!isActive) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId ?? null));
  }, [isActive]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { userId } = await getCurrentAuthUserId();
    setCurrentUserId(userId ?? null);

    const targetUserId = resolvedViewUserId ?? userId ?? null;
    const viewingOther = Boolean(
      resolvedViewUserId && userId && resolvedViewUserId !== userId,
    );

    if (!targetUserId) {
      const { data } = await fetchOwnMemberProfile();
      setMemberProfile(data);
      setFeedPosts([]);
      setCourseRounds([]);
      setBucketListCourses([]);
      setIsLoading(false);
      return;
    }

    const profilePromise = viewingOther
      ? fetchApprovedMemberProfileByUserId(targetUserId)
      : fetchOwnMemberProfile();
    const postsPromise = viewingOther
      ? fetchMemberFeedPostsForUser(targetUserId)
      : fetchMemberFeedPostsForCurrentUser();
    const roundsPromise = viewingOther
      ? fetchMemberCourseRoundsForUser(targetUserId)
      : fetchMemberCourseRoundsForCurrentUser();

    const [{ data: profile, error: profileError }, { data: posts }, { data: rounds }] =
      await Promise.all([profilePromise, postsPromise, roundsPromise]);

    if (profileError) {
      if (import.meta.env.DEV) {
        console.error("[GolferProfilePage] failed to load profile", {
          targetUserId,
          viewingOther,
          message: profileError.message,
        });
      }
      setLoadError("This profile could not be loaded right now.");
      setMemberProfile(null);
      setFeedPosts([]);
      setCourseRounds([]);
      setBucketListCourses([]);
      setIsLoading(false);
      return;
    }

    if (!profile) {
      setLoadError(viewingOther ? "This member profile is not available." : null);
      setMemberProfile(null);
      setFeedPosts([]);
      setCourseRounds([]);
      setBucketListCourses([]);
      setIsLoading(false);
      return;
    }

    let nextProfile = { ...profile, email: "" } as MemberProfileRecord;
    if (!viewingOther) {
      const { data: migratedProfile } = await migrateLegacyPortalProfileExtrasIfNeeded(nextProfile);
      nextProfile = (migratedProfile ?? nextProfile) as MemberProfileRecord;
      hydrateBucketListCourseIds(nextProfile.bucket_list_course_ids);
    }

    setMemberProfile(nextProfile);
    setFeedPosts(posts ?? []);
    setCourseRounds(rounds ?? []);
    setIsLoading(false);
  }, [resolvedViewUserId]);

  useEffect(() => {
    if (!isActive) return;
    setIsEditing(false);
    void loadProfile();
  }, [isActive, profileVersion, loadProfile]);

  useEffect(() => {
    if (!isActive || isViewingOther || !memberProfile) {
      setBucketListCourses([]);
      setIsBucketListLoading(false);
      return;
    }

    let active = true;
    const courseIds = memberProfile.bucket_list_course_ids;

    async function loadBucketList() {
      setIsBucketListLoading(true);

      const { data, error } = await loadBucketListCourseSummaries(courseIds);

      if (!active) return;

      if (error && import.meta.env.DEV) {
        console.error("[GolferProfilePage] bucket list load failed", error);
      }

      setBucketListCourses(data ?? []);
      setIsBucketListLoading(false);
    }

    void loadBucketList();

    return () => {
      active = false;
    };
  }, [isActive, isViewingOther, memberProfile]);

  useEffect(() => {
    if (!isActive || isViewingOther) return;

    function handleBucketListChanged() {
      setProfileVersion((current) => current + 1);
    }

    window.addEventListener("elitetee:course-state-changed", handleBucketListChanged);

    return () => {
      window.removeEventListener("elitetee:course-state-changed", handleBucketListChanged);
    };
  }, [isActive, isViewingOther]);

  const display = useMemo(() => {
    return buildGolferProfileDisplay(memberProfile, undefined, {
      coverImageUrl,
      avatarImageUrl,
    });
  }, [avatarImageUrl, coverImageUrl, memberProfile, profileVersion]);

  const uniqueCourses = useMemo(() => buildUniqueCoursesPlayed(courseRounds), [courseRounds]);
  const experienceStats = useMemo(
    () => buildProfileExperienceStats(courseRounds, feedPosts.length),
    [courseRounds, feedPosts.length],
  );
  const recentExperiences = useMemo(() => courseRounds, [courseRounds]);
  const bucketListCount = bucketListCourses.length;

  const joinedLabel = formatJoinedDate(memberProfile?.created_at || memberProfile?.updated_at);
  const canMessage = isViewingOther && Boolean(onMessageMember && memberProfile?.user_id);
  const canRequestIntroduction =
    isViewingOther && Boolean(onRequestIntroduction && memberProfile?.user_id);
  const businessInterests = (memberProfile?.business_interests ?? []).filter(isMeaningfulProfileText);
  const headlineLabel = isMeaningfulProfileText(display.title) ? display.title.trim() : "";
  const homeClubLabel = isMeaningfulProfileText(display.homeCourse) ? display.homeCourse.trim() : "";
  const locationLabel = isMeaningfulProfileText(display.location) ? display.location.trim() : "";
  const travelLabel = isMeaningfulProfileText(display.upcomingTravel)
    ? display.upcomingTravel.trim()
    : "";
  const favoriteCourses = display.favoriteCourses.filter(isMeaningfulProfileText);
  const meaningfulConnectionInterests = useMemo(
    () => display.connectionInterests.filter(isMeaningfulProfileText),
    [display.connectionInterests],
  );
  const { tags: connectionInterestTags, textItems: connectionInterestProse } = useMemo(
    () => partitionProfileDisplayItems(meaningfulConnectionInterests),
    [meaningfulConnectionInterests],
  );
  const profileFeedPosts = useMemo(
    () => feedPosts.slice(0, PROFILE_FEED_ACTIVITY_LIMIT),
    [feedPosts],
  );
  const hasGolfActivity = courseRounds.length > 0;
  const showBusinessSection = businessInterests.length > 0;
  const showConnectionInterestTags = connectionInterestTags.length > 0;
  const showConnectionInterestProse = connectionInterestProse.length > 0;
  const showHandicap = !isViewingOther;
  const showGolfSection =
    homeClubLabel.length > 0 ||
    favoriteCourses.length > 0 ||
    showHandicap;

  if (isEditing && !isViewingOther) {
    return (
      <div className="et-profile et-profile--edit" aria-labelledby="profile-edit-heading">
        <header className="et-profile-edit-header">
          <div>
            <p className="et-profile-eyebrow">Member Profile</p>
            <h2 id="profile-edit-heading">Edit Profile</h2>
            <p className="et-profile-section-lead">{earlyStageCopy.profileOnboarding}</p>
          </div>
          <button
            type="button"
            className="et-btn et-btn--secondary"
            onClick={() => setIsEditing(false)}
          >
            View Profile
          </button>
        </header>
        <ProfileDossier
          isActive={isActive}
          onSaved={() => {
            setProfileVersion((version) => version + 1);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  if (!isLoading && loadError) {
    return (
      <div className="et-profile" aria-labelledby="profile-heading">
        {onBack ? (
          <button type="button" className="et-profile-back" onClick={onBack}>
            ← {backLabel}
          </button>
        ) : null}
        <ProfileEmptyState title="Profile unavailable" hint={loadError} />
        <button
          type="button"
          className="et-btn et-btn--secondary"
          onClick={() => setProfileVersion((version) => version + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isLoading && !memberProfile) {
    return (
      <div className="et-profile" aria-labelledby="profile-heading">
        {onBack ? (
          <button type="button" className="et-profile-back" onClick={onBack}>
            ← {backLabel}
          </button>
        ) : null}
        <ProfileEmptyState
          title="Complete your profile"
          hint="Your member profile is not linked to this account yet. If you just joined through an invite, refresh the page. Otherwise contact membership@elitetee.club."
        />
      </div>
    );
  }

  return (
    <article className="et-profile" aria-labelledby="profile-heading">
      {onBack ? (
        <button type="button" className="et-profile-back" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : null}

      {isLoading ? <p className="et-profile-loading">Loading profile…</p> : null}

      {!isLoading && memberProfile ? (
        <>
          <header className="et-profile-hero">
            <div className="et-profile-hero-cover">
              <ProfileCover src={display.coverImage} alt={`${display.name} cover`}>
                <div className="et-profile-hero-actions">
                  {!isViewingOther ? (
                    <button
                      type="button"
                      className="et-btn et-btn--forest"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      {canRequestIntroduction ? (
                        <button
                          type="button"
                          className="et-btn et-btn--secondary"
                          onClick={() => onRequestIntroduction?.(memberProfile)}
                        >
                          Request Introduction
                        </button>
                      ) : null}
                      {canMessage && memberProfile.user_id ? (
                        <button
                          type="button"
                          className="et-btn et-btn--forest"
                          onClick={() =>
                            onMessageMember?.(
                              memberProfile.user_id as string,
                              memberProfile.full_name,
                            )
                          }
                        >
                          Message
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </ProfileCover>
            </div>

            <div className="et-profile-hero-avatar">
              <ProfileMemberAvatar name={display.name} imageUrl={display.avatarImage} size="xl" />
            </div>
            <div className="et-profile-identity">
                <p className="et-profile-eyebrow">Member Profile</p>
                <div className="et-profile-name-row">
                  <h1 id="profile-heading" className="et-profile-name">
                    {display.name}
                  </h1>
                  {display.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
                </div>
                {headlineLabel ? (
                  <p className="et-profile-headline">{headlineLabel}</p>
                ) : null}
                {locationLabel ? (
                  <p className="et-profile-location">{locationLabel}</p>
                ) : !isViewingOther ? (
                  <p className="et-profile-location">Add your location in Edit Profile</p>
                ) : null}
                {homeClubLabel ? (
                  <p className="et-profile-club">
                    Home club · <strong>{homeClubLabel}</strong>
                  </p>
                ) : !isViewingOther ? (
                  <p className="et-profile-club">
                    Home club · <strong>Add in Edit Profile</strong>
                  </p>
                ) : null}
                <div className="et-profile-badges">
                  <span className="et-profile-badge et-profile-badge--gold">
                    {memberProfile.founding_member_number ?? earlyStageCopy.foundingMember}
                  </span>
                  <span className="et-profile-badge et-profile-badge--muted">
                    {formatMembershipLabel(memberProfile.membership_status)}
                  </span>
                  {joinedLabel ? (
                    <span className="et-profile-badge et-profile-badge--muted">
                      Joined {joinedLabel}
                    </span>
                  ) : null}
                </div>
                <p className="et-profile-note">{earlyStageCopy.foundingMemberNote}</p>
            </div>
          </header>

          <div className="et-profile-layout">
            <div className="et-profile-main">
              <ProfileSection
                title="About"
                description="How this member shows up in the EliteTee network."
              >
                {!isViewingOther ? (
                  <p className="et-profile-section-lead">{earlyStageCopy.profileOnboarding}</p>
                ) : null}
                <p className="et-profile-about">{display.bio}</p>
                {showConnectionInterestProse ? (
                  <div className="et-profile-connection-prose">
                    <p className="et-profile-section-lead">Connection interests</p>
                    <ProfileProsePreview items={connectionInterestProse} />
                  </div>
                ) : null}
              </ProfileSection>

              <ProfileSection
                title="Experience statistics"
                description="Real activity drawn from shared rounds and feed posts."
              >
                <dl className="et-profile-stats">
                  <div className="et-profile-stat et-profile-stat--accent">
                    <dt>Rounds shared</dt>
                    <dd>{experienceStats.roundsShared}</dd>
                  </div>
                  <div className="et-profile-stat">
                    <dt>Courses played</dt>
                    <dd>{experienceStats.coursesPlayed}</dd>
                  </div>
                  <div className="et-profile-stat">
                    <dt>Feed posts</dt>
                    <dd>{experienceStats.feedPosts}</dd>
                  </div>
                  <div className="et-profile-stat">
                    <dt>Connections</dt>
                    <dd>{experienceStats.connections}</dd>
                  </div>
                </dl>
                {!isViewingOther ? (
                  <p className="et-profile-note">{earlyStageCopy.profileStatsNote}</p>
                ) : null}
              </ProfileSection>

              {hasGolfActivity ? (
                <>
                  <ProfileSection
                    title="Recent experiences"
                    description={
                      isViewingOther
                        ? "The latest rounds this member has shared."
                        : "Your most recent rounds and reviews."
                    }
                  >
                    <MemberActivityList
                      rounds={recentExperiences}
                      variant="profile"
                      maxItems={PROFILE_RECENT_EXPERIENCE_LIMIT}
                      showMemberIdentity={false}
                      allowPhotoDelete={!isViewingOther}
                      onRoundsChanged={() => void loadProfile()}
                    />
                  </ProfileSection>

                  <ProfileSection
                    title="Courses played"
                    description="Distinct courses represented in shared experiences."
                  >
                    <ProfileCoursesPlayed courses={uniqueCourses} isViewingOther={isViewingOther} />
                  </ProfileSection>
                </>
              ) : (
                <ProfileSection
                  title="Golf activity"
                  description="Shared rounds and course history on EliteTee."
                >
                  <ProfileEmptyState
                    title={earlyStageCopy.roundsEmpty}
                    hint={
                      isViewingOther
                        ? "This member has not shared course rounds yet."
                        : "Add a course round from Courses to build your golf history."
                    }
                  />
                </ProfileSection>
              )}

              {feedPosts.length > 0 ? (
                <ProfileSection
                  title="Recent feed activity"
                  description={
                    isViewingOther
                      ? "Posts this member has shared in the member feed."
                      : "Posts you've shared in the member feed."
                  }
                >
                  <ProfileFeedActivityList
                    posts={profileFeedPosts}
                    onOpenPost={onOpenFeedPost}
                  />
                </ProfileSection>
              ) : null}
            </div>

            <aside className="et-profile-aside">
              {!isViewingOther ? <InviteGolfer variant="full" /> : null}

              {showGolfSection ? (
              <ProfileSection title="Golf" description="Where they play and what they love.">
                <dl className="et-profile-aside-block">
                  {homeClubLabel ? (
                    <div>
                      <dt>Home club</dt>
                      <dd>{homeClubLabel}</dd>
                    </div>
                  ) : null}
                  {showHandicap ? (
                    <div>
                      <dt>Handicap</dt>
                      <dd>
                        {display.handicap !== undefined
                          ? display.handicap
                          : "Add your handicap in Edit Profile."}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {favoriteCourses.length > 0 ? (
                  <div>
                    <p className="et-profile-section-lead">Favorite courses</p>
                    <ul className="et-profile-chips">
                      {favoriteCourses.map((course) => (
                        <li key={course}>
                          <span className="et-profile-chip">{course}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </ProfileSection>
              ) : null}

              {showBusinessSection ? (
                <ProfileSection title="Business" description="Professional context and interests.">
                  <ProfileTagOrTextList items={businessInterests} />
                </ProfileSection>
              ) : null}

              {travelLabel ? (
                <ProfileSection title="Travel" description="Upcoming golf travel and destinations.">
                  <p className="et-profile-travel">{travelLabel}</p>
                </ProfileSection>
              ) : null}

              {showConnectionInterestTags ? (
                <ProfileSection
                  title="Interests"
                  description="Connection goals and golf interests."
                >
                  <ProfileTagOrTextList items={connectionInterestTags} />
                </ProfileSection>
              ) : null}

              {!isViewingOther ? (
                <ProfileSection
                  title="Bucket list"
                  description={
                    bucketListCount > 0
                      ? `${bucketListCount} course${bucketListCount === 1 ? "" : "s"} you want to play next.`
                      : "Courses you want to play next."
                  }
                >
                  <ProfileBucketList courses={bucketListCourses} isLoading={isBucketListLoading} />
                </ProfileSection>
              ) : null}
            </aside>
          </div>
        </>
      ) : null}
    </article>
  );
}
