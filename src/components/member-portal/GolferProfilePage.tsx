import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { isAdminEmail } from "../../lib/admin";
import { mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
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
import { buildGolferProfileDisplay } from "../../lib/portalProfileDisplay";
import {
  buildProfileExperienceStats,
  buildUniqueCoursesPlayed,
} from "../../lib/profilePageDisplay";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { fetchIntroductionRequests } from "../../lib/introductionRequests";
import {
  calculateProfileCompletion,
  countAcceptedIntroductionConnections,
} from "../../lib/profileConfidence";
import { migrateLegacyPortalProfileExtrasIfNeeded } from "../../lib/portalProfileExtras";
import { useResolvedMemberProfileMedia } from "../../lib/useResolvedMemberProfileMedia";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { FeedCard } from "./FeedCard";
import { FEED_CARD_SCOPE_CLASS } from "../../lib/feedCardScope";
import { MemberActivityList } from "./MemberActivityList";
import { ProfileCover } from "./ProfileCover";
import { ProfileDossier } from "./ProfileDossier";
import { ProfileBucketList } from "./profile/ProfileBucketList";
import { ProfileCoursesPlayed } from "./profile/ProfileCoursesPlayed";
import { ProfileMemberAvatar } from "./profile/ProfileMemberAvatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ClubMark } from "./ClubMark";

const PROFILE_PREVIEW_LIMIT = 3;
const PROFILE_COURSE_LIMIT = 6;

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
};

export function GolferProfilePage({
  isActive,
  viewUserId = null,
  onBack,
  backLabel = "Back",
  onMessageMember,
  onRequestIntroduction,
  onViewMemberProfile,
}: GolferProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfileRecord | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [courseRounds, setCourseRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [bucketListCourses, setBucketListCourses] = useState<BucketListCourseSummary[]>([]);
  const [isBucketListLoading, setIsBucketListLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptedConnectionCount, setAcceptedConnectionCount] = useState<number | null>(null);

  const resolvedViewUserId = viewUserId?.trim() || null;
  const isViewingOther = Boolean(resolvedViewUserId && resolvedViewUserId !== currentUserId);
  const { coverImageUrl, avatarImageUrl } = useResolvedMemberProfileMedia(memberProfile);

  useEffect(() => {
    if (!isActive) return;
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId ?? null));
    if (!isSupabaseConfigured || !supabase) {
      setViewerIsAdmin(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setViewerIsAdmin(isAdminEmail(data.session?.user.email));
    });
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
    const introductionPromise = viewingOther
      ? Promise.resolve({ data: null, error: null })
      : fetchIntroductionRequests();

    const [
      { data: profile, error: profileError },
      { data: posts },
      { data: rounds },
      introductionResult,
    ] = await Promise.all([profilePromise, postsPromise, roundsPromise, introductionPromise]);

    setAcceptedConnectionCount(
      viewingOther || introductionResult.error
        ? null
        : countAcceptedIntroductionConnections(introductionResult.data ?? [], userId ?? null),
    );

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
  const profileCoursePreview = useMemo(
    () => uniqueCourses.slice(0, PROFILE_COURSE_LIMIT),
    [uniqueCourses],
  );
  const experienceStats = useMemo(
    () => buildProfileExperienceStats(courseRounds, feedPosts.length, acceptedConnectionCount ?? 0),
    [acceptedConnectionCount, courseRounds, feedPosts.length],
  );
  const profileCompletion = useMemo(
    () => memberProfile && !isViewingOther ? calculateProfileCompletion(memberProfile) : null,
    [isViewingOther, memberProfile],
  );
  const recentExperiences = useMemo(
    () => courseRounds.slice(0, PROFILE_PREVIEW_LIMIT),
    [courseRounds],
  );
  const recentFeedPosts = useMemo(
    () => feedPosts.slice(0, PROFILE_PREVIEW_LIMIT),
    [feedPosts],
  );
  const bucketListCount = bucketListCourses.length;

  const joinedLabel = formatJoinedDate(memberProfile?.created_at || memberProfile?.updated_at);
  const canMessage = isViewingOther && Boolean(onMessageMember && memberProfile?.user_id);
  const canRequestIntroduction =
    isViewingOther && Boolean(onRequestIntroduction && memberProfile?.user_id);
  const businessInterests = memberProfile?.business_interests ?? [];
  const industryLabel = display.title.trim();

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
        <button type="button" className="et-btn et-btn--secondary" onClick={() => void loadProfile()}>
          Retry
        </button>
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
                {industryLabel ? (
                  <p className="et-profile-headline">Industry · {industryLabel}</p>
                ) : null}
                <p className="et-profile-location">
                  {display.location ||
                    (isViewingOther ? "Location not shared" : "Add your location in Edit Profile")}
                </p>
                <p className="et-profile-club">
                  <ClubMark name={display.homeCourse || "EliteTee"} size="sm" />
                  <span>Home club · <strong>{display.homeCourse || "Not shared"}</strong></span>
                </p>
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
                {profileCompletion ? (
                  <div className="et-profile-completion" aria-label={`Profile ${profileCompletion.percentage}% complete`}>
                    <span>Profile {profileCompletion.percentage}% complete</span>
                    <progress value={profileCompletion.completed} max={profileCompletion.total}>
                      {profileCompletion.percentage}%
                    </progress>
                    {profileCompletion.missing.length > 0 ? (
                      <small>Still to add: {profileCompletion.missing.join(", ")}.</small>
                    ) : (
                      <small>All profile foundations are complete.</small>
                    )}
                  </div>
                ) : null}
            </div>
          </header>

          <div className="et-profile-layout">
            <div className="et-profile-main">
              <ProfileSection
                title="Current request"
                description="What this member is hoping to find through the EliteTee network."
              >
                {display.bio ? (
                  <p className="et-profile-about">{display.bio}</p>
                ) : (
                  <p className="et-profile-section-lead">
                    {isViewingOther
                      ? "This member has not shared a current request."
                      : "Add a current request in Edit Profile so members know how they can help."}
                  </p>
                )}
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
                  {!isViewingOther && acceptedConnectionCount !== null ? (
                    <div className="et-profile-stat">
                      <dt>Accepted introductions</dt>
                      <dd>{experienceStats.connections}</dd>
                    </div>
                  ) : null}
                </dl>
                {!isViewingOther ? (
                  <p className="et-profile-note">{earlyStageCopy.profileStatsNote}</p>
                ) : null}
              </ProfileSection>

              <ProfileSection
                title="Recent experiences"
                description={
                  isViewingOther
                    ? "The latest rounds this member has shared."
                    : "Your most recent rounds and reviews."
                }
              >
                {recentExperiences.length > 0 ? (
                  <MemberActivityList
                    rounds={recentExperiences}
                    showMemberIdentity={false}
                    allowPhotoDelete={!isViewingOther}
                    onRoundsChanged={() => void loadProfile()}
                  />
                ) : (
                  <ProfileEmptyState
                    title={earlyStageCopy.roundsEmpty}
                    hint={
                      isViewingOther
                        ? "This member has not shared course rounds yet."
                        : "Add a course round from Courses to build your golf history."
                    }
                  />
                )}
              </ProfileSection>

              <ProfileSection
                title="Courses played"
                description="Distinct courses represented in shared experiences."
              >
                <ProfileCoursesPlayed courses={profileCoursePreview} isViewingOther={isViewingOther} />
              </ProfileSection>

              {feedPosts.length > 0 ? (
                <ProfileSection
                  title="Recent feed activity"
                  description={
                    isViewingOther
                      ? "Posts this member has shared in the member feed."
                      : "Posts you've shared in the member feed."
                  }
                >
                  <div className={`et-profile-feed-grid ${FEED_CARD_SCOPE_CLASS}`}>
                    {recentFeedPosts.map((post, index) => (
                      <FeedCard
                        key={post.id}
                        post={post}
                        index={index}
                        currentUserId={currentUserId}
                        viewerIsAdmin={viewerIsAdmin}
                        onViewAuthor={onViewMemberProfile}
                        onPostUpdated={(updatedPost) => {
                          setFeedPosts((current) =>
                            current.map((entry) =>
                              entry.id === updatedPost.id
                                ? mergeFeedPostAfterEdit(entry, updatedPost)
                                : entry,
                            ),
                          );
                        }}
                      />
                    ))}
                  </div>
                </ProfileSection>
              ) : null}
            </div>

            <aside className="et-profile-aside">
              <ProfileSection title="Golf" description="Where they play and what they love.">
                <dl className="et-profile-aside-block">
                  <div>
                    <dt>Home club</dt>
                    <dd>{display.homeCourse || "Not shared"}</dd>
                  </div>
                  {!isViewingOther ? (
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
                <div>
                  <p className="et-profile-section-lead">Other clubs &amp; courses</p>
                  {display.favoriteCourses.length > 0 ? (
                    <ul className="et-profile-chips">
                      {display.favoriteCourses.map((course) => (
                        <li key={course}>
                          <span className="et-profile-chip">{course}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ProfileEmptyState
                      title="No other clubs or courses shared yet."
                      hint={
                        isViewingOther
                          ? "This member has not shared other clubs or regular courses yet."
                          : "Add other clubs or courses you regularly play in Edit Profile."
                      }
                    />
                  )}
                </div>
              </ProfileSection>

              {(industryLabel || businessInterests.length > 0) && (
                <ProfileSection title="Business" description="Professional context and interests.">
                  {industryLabel ? (
                    <dl className="et-profile-aside-block">
                      <div>
                        <dt>Industry</dt>
                        <dd>{industryLabel}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {businessInterests.length > 0 ? (
                    <ul className="et-profile-chips">
                      {businessInterests.map((interest) => (
                        <li key={interest}>
                          <span className="et-profile-chip">{interest}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </ProfileSection>
              )}

              <ProfileSection title="Travel" description="Upcoming golf travel and destinations.">
                {display.upcomingTravel ? (
                  <p className="et-profile-travel">{display.upcomingTravel}</p>
                ) : (
                  <ProfileEmptyState
                    title={earlyStageCopy.tripsEmpty}
                    hint={
                      isViewingOther
                        ? "This member has not shared upcoming travel yet."
                        : "Share upcoming golf travel in Edit Profile to connect with members nearby."
                    }
                  />
                )}
              </ProfileSection>

              <ProfileSection
                title="Interests"
                description="Connection goals and golf interests."
              >
                {display.connectionInterests.length > 0 ? (
                  <ul className="et-profile-chips">
                    {display.connectionInterests.map((interest) => (
                      <li key={interest}>
                        <span className="et-profile-chip">{interest}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ProfileEmptyState
                    title={earlyStageCopy.connectionInterestsTitle}
                    hint={
                      isViewingOther
                        ? "This member has not shared connection interests yet."
                        : earlyStageCopy.connectionInterestsEmpty
                    }
                  />
                )}
              </ProfileSection>

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
