import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { fetchMemberFeedPostsForCurrentUser, fetchMemberFeedPostsForUser } from "../../lib/memberFeedPosts";
import {
  fetchMemberCourseRoundsForCurrentUser,
  fetchMemberCourseRoundsForUser,
} from "../../lib/memberCourseRounds";
import {
  fetchApprovedMemberProfileByUserId,
  fetchOwnMemberProfile,
} from "../../lib/memberProfiles";
import { buildGolferProfileDisplay } from "../../lib/portalProfileDisplay";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { useResolvedMemberProfileMedia } from "../../lib/useResolvedMemberProfileMedia";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { FeedCard } from "./FeedCard";
import { MemberActivityList } from "./MemberActivityList";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { ProfileCover } from "./ProfileCover";
import { ProfileDossier } from "./ProfileDossier";
import { VerifiedBadge } from "./VerifiedBadge";

function ProfileEmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="portal-profile-empty">
      <p className="portal-profile-empty-title">{title}</p>
      <p className="portal-profile-empty-hint">{hint}</p>
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
    <section className="portal-profile-section">
      <header className="portal-profile-section-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="portal-profile-section-body">{children}</div>
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
  const [memberProfile, setMemberProfile] = useState<MemberProfileRecord | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [courseRounds, setCourseRounds] = useState<MemberCourseRoundRecord[]>([]);
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
      setIsLoading(false);
      return;
    }

    if (!profile) {
      setLoadError(viewingOther ? "This member profile is not available." : null);
      setMemberProfile(null);
      setFeedPosts([]);
      setCourseRounds([]);
      setIsLoading(false);
      return;
    }

    setMemberProfile(
      profile ? ({ ...profile, email: "" } as MemberProfileRecord) : null,
    );
    setFeedPosts(posts ?? []);
    setCourseRounds(rounds ?? []);
    setIsLoading(false);
  }, [resolvedViewUserId]);

  useEffect(() => {
    if (!isActive) return;
    setIsEditing(false);
    void loadProfile();
  }, [isActive, profileVersion, loadProfile]);

  const display = useMemo(() => {
    const extras = isViewingOther ? undefined : getPortalProfileExtras(memberProfile?.user_id);
    return buildGolferProfileDisplay(memberProfile, extras, {
      coverImageUrl,
      avatarImageUrl,
    });
  }, [avatarImageUrl, coverImageUrl, isViewingOther, memberProfile, profileVersion]);

  const joinedLabel = formatJoinedDate(memberProfile?.created_at || memberProfile?.updated_at);
  const roundsShared = courseRounds.length;
  const connections = 0;
  const canMessage = isViewingOther && Boolean(onMessageMember && memberProfile?.user_id);
  const canRequestIntroduction =
    isViewingOther && Boolean(onRequestIntroduction && memberProfile?.user_id);

  if (isEditing && !isViewingOther) {
    return (
      <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
        <header className="portal-section-head portal-section-head--social portal-profile-edit-head">
          <div>
            <h2 id="profile-heading">Edit Profile</h2>
            <p>{earlyStageCopy.profileOnboarding}</p>
          </div>
          <button
            type="button"
            className="portal-btn portal-btn--outline portal-btn--compact"
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
      </section>
    );
  }

  if (!isLoading && loadError) {
    return (
      <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
        {onBack ? (
          <button type="button" className="portal-profile-back" onClick={onBack}>
            ← {backLabel}
          </button>
        ) : null}
        <header className="portal-section-head portal-section-head--social">
          <h2 id="profile-heading">Profile</h2>
        </header>
        <ProfileEmptyState title="Profile unavailable" hint={loadError} />
        <button
          type="button"
          className="portal-btn portal-btn--outline portal-btn--compact"
          onClick={() => {
            setProfileVersion((version) => version + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  if (!isLoading && !memberProfile) {
    return (
      <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
        {onBack ? (
          <button type="button" className="portal-profile-back" onClick={onBack}>
            ← {backLabel}
          </button>
        ) : null}
        <header className="portal-section-head portal-section-head--social">
          <h2 id="profile-heading">Profile</h2>
        </header>
        <ProfileEmptyState
          title="Complete your profile"
          hint="Your member profile is not linked to this account yet. If you just joined through an invite, refresh the page. Otherwise contact membership@elitetee.club."
        />
      </section>
    );
  }

  return (
    <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
      {onBack ? (
        <button type="button" className="portal-profile-back" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : null}

      {isLoading ? <p className="portal-empty">Loading profile…</p> : null}

      <article className="portal-golfer-profile portal-golfer-profile--premium">
        <ProfileCover src={display.coverImage} alt={`${display.name} cover`}>
          {!isViewingOther ? (
            <button
              type="button"
              className="portal-btn portal-btn--gold portal-btn--compact portal-golfer-edit"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="portal-golfer-cover-actions">
              {canRequestIntroduction && memberProfile ? (
                <button
                  type="button"
                  className="portal-btn portal-btn--outline portal-btn--compact"
                  onClick={() => onRequestIntroduction?.(memberProfile)}
                >
                  Request Introduction
                </button>
              ) : null}
              {canMessage && memberProfile?.user_id ? (
                <button
                  type="button"
                  className="portal-btn portal-btn--gold portal-btn--compact"
                  onClick={() =>
                    onMessageMember?.(memberProfile.user_id as string, memberProfile.full_name)
                  }
                >
                  Message
                </button>
              ) : null}
            </div>
          )}
        </ProfileCover>

        <div className="portal-golfer-profile-main">
          <div className="portal-golfer-profile-hero-block">
            <div className="portal-golfer-profile-header">
              <div className="portal-golfer-profile-avatar-col">
                <div className="portal-golfer-avatar-wrap">
                  <MemberClubAvatar
                    member={{ club_logo_url: display.avatarImage || null }}
                    name={display.name}
                    size="lg"
                  />
                </div>
              </div>
              <div className="portal-golfer-profile-identity">
                <h2 id="profile-heading" className="portal-golfer-profile-name">
                  <span className="portal-golfer-profile-name-text">{display.name}</span>
                  {display.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
                </h2>
                {display.title ? <p className="portal-golfer-title">{display.title}</p> : null}
                <p className="portal-golfer-location">
                  {display.location ||
                    (isViewingOther ? "Location not shared" : "Add your location in Edit Profile")}
                </p>
                <div className="portal-golfer-profile-identity-meta">
                  <span className="portal-golfer-member-badge portal-golfer-founding-badge">
                    {memberProfile?.founding_member_number ?? earlyStageCopy.foundingMember}
                  </span>
                  {memberProfile ? (
                    <span className="portal-golfer-status-badge">
                      {formatMembershipLabel(memberProfile.membership_status)}
                    </span>
                  ) : null}
                  {joinedLabel ? (
                    <span className="portal-golfer-joined-badge">Joined {joinedLabel}</span>
                  ) : null}
                </div>
                <p className="portal-golfer-founding-note">{earlyStageCopy.foundingMemberNote}</p>
              </div>
            </div>
          </div>

          <ProfileSection title="Bio">
            {!isViewingOther ? (
              <p className="portal-profile-intro-note">{earlyStageCopy.profileOnboarding}</p>
            ) : null}

            <div className="portal-profile-card portal-profile-card--inline">
              <h4>Bio</h4>
              <p>{display.bio}</p>
            </div>
          </ProfileSection>

          <dl className="portal-profile-stats-grid portal-profile-stats-grid--early">
            <div className="portal-profile-stat">
              <dt>Course Rounds</dt>
              <dd>{roundsShared}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Connections</dt>
              <dd>{connections}</dd>
            </div>
          </dl>

          <ProfileSection
            title="Golf Background"
            description="Where you play and what defines your game."
          >
            <div className="portal-profile-cards portal-profile-cards--compact">
              <div className="portal-profile-card">
                <h4>Home Course</h4>
                <p>
                  {display.homeCourse ||
                    (isViewingOther
                      ? "Not shared"
                      : "Add your home course in Edit Profile.")}
                </p>
              </div>
              {!isViewingOther ? (
                <div className="portal-profile-card">
                  <h4>Handicap</h4>
                  {display.handicap !== undefined ? (
                    <p>{display.handicap}</p>
                  ) : (
                    <ProfileEmptyState
                      title="Not added yet"
                      hint="Add your handicap in Edit Profile."
                    />
                  )}
                </div>
              ) : null}
              <div className="portal-profile-card portal-profile-card--wide">
                <h4>Favorite Courses</h4>
                {display.favoriteCourses.length > 0 ? (
                  <ul>
                    {display.favoriteCourses.map((course) => (
                      <li key={course}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  <ProfileEmptyState
                    title={earlyStageCopy.favoriteCoursesEmpty}
                    hint={
                      isViewingOther
                        ? "This member has not shared favorite courses yet."
                        : "List the courses that define your game in Edit Profile."
                    }
                  />
                )}
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            title="Travel Plans"
            description="Let members know where you're headed next."
          >
            {display.upcomingTravel ? (
              <p className="portal-profile-travel-copy">{display.upcomingTravel}</p>
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
            title="Connection Interests"
            description="The golf relationships and introductions they're open to."
          >
            {display.connectionInterests.length > 0 ? (
              <ul className="portal-profile-interest-list">
                {display.connectionInterests.map((interest) => (
                  <li key={interest}>{interest}</li>
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

          {memberProfile?.business_interests?.length ? (
            <ProfileSection title="Off-Course Interests">
              <ul className="portal-profile-interest-list">
                {memberProfile.business_interests.map((interest) => (
                  <li key={interest}>{interest}</li>
                ))}
              </ul>
            </ProfileSection>
          ) : null}

          <ProfileSection
            title="Course Rounds"
            description={
              isViewingOther
                ? "Courses this member has played and shared with EliteTee."
                : "Every course you've played and shared with EliteTee members."
            }
          >
            {courseRounds.length > 0 ? (
              <MemberActivityList
                rounds={courseRounds}
                showMemberIdentity={false}
                allowPhotoDelete={!isViewingOther}
                onRoundsChanged={() => {
                  void loadProfile();
                }}
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

          {feedPosts.length > 0 ? (
            <ProfileSection
              title="Recent Feed Activity"
              description={
                isViewingOther
                  ? "Posts this member has shared in the member feed."
                  : "Posts you've shared in the member feed."
              }
            >
              <div
                className={`portal-profile-rounds${feedPosts.length === 1 ? " portal-profile-rounds--single" : ""}`}
              >
                {feedPosts.map((post, index) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    index={index}
                    onViewAuthor={onViewMemberProfile}
                  />
                ))}
              </div>
            </ProfileSection>
          ) : null}
        </div>
      </article>
    </section>
  );
}
