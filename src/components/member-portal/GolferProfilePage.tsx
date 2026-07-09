import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoCourses, earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { photos } from "../../assets/photos";
import { SafeImage } from "../SafeImage";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getBucketListCourseIds, getPlayedCourseIds } from "../../lib/portalCourseState";
import { buildGolferProfileDisplay } from "../../lib/portalProfileDisplay";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { FeedCard } from "./FeedCard";
import { MemberClubAvatar } from "./MemberClubAvatar";
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

type GolferProfilePageProps = {
  isActive: boolean;
  feedPosts?: FeedPost[];
};

export function GolferProfilePage({ isActive, feedPosts = [] }: GolferProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [courseStateVersion, setCourseStateVersion] = useState(0);
  const [memberProfile, setMemberProfile] = useState<Awaited<
    ReturnType<typeof fetchOwnMemberProfile>
  >["data"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const { data } = await fetchOwnMemberProfile();
    setMemberProfile(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    void loadProfile();
  }, [isActive, profileVersion, loadProfile]);

  useEffect(() => {
    if (!isActive) return;
    const refreshCourseState = () => setCourseStateVersion((version) => version + 1);
    refreshCourseState();
    window.addEventListener("storage", refreshCourseState);
    window.addEventListener("focus", refreshCourseState);
    window.addEventListener("elitetee:course-state-changed", refreshCourseState);
    return () => {
      window.removeEventListener("storage", refreshCourseState);
      window.removeEventListener("focus", refreshCourseState);
      window.removeEventListener("elitetee:course-state-changed", refreshCourseState);
    };
  }, [isActive]);

  const display = useMemo(() => {
    const extras = getPortalProfileExtras(memberProfile?.user_id);
    return buildGolferProfileDisplay(memberProfile, extras);
  }, [memberProfile, profileVersion]);

  const { savedCourses, playedCourses } = useMemo(() => {
    void courseStateVersion;
    const savedIds = getBucketListCourseIds();
    const playedIds = getPlayedCourseIds();
    return {
      savedCourses: demoCourses.filter((course) => savedIds.includes(course.id)),
      playedCourses: demoCourses.filter((course) => playedIds.includes(course.id)),
    };
  }, [courseStateVersion]);

  const roundsShared = feedPosts.length;
  const coursesSaved = savedCourses.length;
  const connections = 0;

  if (isEditing) {
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

  return (
    <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
      {isLoading ? <p className="portal-empty">Loading your profile...</p> : null}

      <article className="portal-golfer-profile portal-golfer-profile--premium">
        <div className="portal-golfer-cover">
          <SafeImage
            src={display.coverImage || photos.heroSunset}
            alt="Profile cover"
            objectPosition="center"
            fill
            fallbackClassName="portal-golfer-cover-fallback"
          />
          <button
            type="button"
            className="portal-btn portal-btn--gold portal-btn--compact portal-golfer-edit"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        </div>

        <div className="portal-golfer-profile-main">
          <ProfileSection title="Member Identity">
            <div className="portal-golfer-profile-header">
              <div className="portal-golfer-avatar-wrap">
                <MemberClubAvatar member={{ club_logo_url: display.avatarImage ?? null }} size="lg" />
              </div>
              <div className="portal-golfer-profile-identity">
                <h2 id="profile-heading">
                  {display.name}
                  {display.isVerified ? <VerifiedBadge label="Verified golfer" /> : null}
                </h2>
                {display.title ? <p className="portal-golfer-title">{display.title}</p> : null}
                <p className="portal-golfer-location">
                  {display.location || "Add your location in Edit Profile"}
                </p>
                <span className="portal-golfer-member-badge portal-golfer-founding-badge">
                  {memberProfile?.founding_member_number ?? earlyStageCopy.foundingMember}
                </span>
                <p className="portal-golfer-founding-note">{earlyStageCopy.foundingMemberNote}</p>
                {memberProfile ? (
                  <span className="portal-golfer-status-badge">
                    {formatMembershipLabel(memberProfile.membership_status)}
                  </span>
                ) : null}
              </div>
            </div>

            <p className="portal-profile-intro-note">{earlyStageCopy.profileOnboarding}</p>

            <div className="portal-profile-card portal-profile-card--inline">
              <h4>Bio</h4>
              <p>{display.bio}</p>
            </div>
          </ProfileSection>

          <dl className="portal-profile-stats-grid portal-profile-stats-grid--early">
            <div className="portal-profile-stat">
              <dt>Rounds Shared</dt>
              <dd>{roundsShared}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Courses Saved</dt>
              <dd>{coursesSaved}</dd>
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
                <p>{display.homeCourse || "Add your home course in Edit Profile."}</p>
              </div>
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
                    hint="List the courses that define your game in Edit Profile."
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
                hint="Share upcoming golf travel in Edit Profile to connect with members nearby."
              />
            )}
          </ProfileSection>

          <ProfileSection
            title="Courses Played"
            description="Courses you've marked as played or saved from the library."
          >
            <div className="portal-profile-cards portal-profile-cards--compact">
              <div className="portal-profile-card">
                <h4>Played</h4>
                {playedCourses.length > 0 ? (
                  <ul>
                    {playedCourses.map((course) => (
                      <li key={course.id}>
                        {course.name} · {course.location}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ProfileEmptyState
                    title="No played courses yet"
                    hint="Mark courses as played from the Courses page."
                  />
                )}
              </div>
              <div className="portal-profile-card">
                <h4>Saved</h4>
                {savedCourses.length > 0 ? (
                  <ul>
                    {savedCourses.map((course) => (
                      <li key={course.id}>
                        {course.name} · {course.location}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ProfileEmptyState
                    title="No saved courses yet"
                    hint="Save courses from the Courses page to build your list."
                  />
                )}
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            title="Connection Interests"
            description="The golf relationships and introductions you're open to."
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
                hint={earlyStageCopy.connectionInterestsEmpty}
              />
            )}
          </ProfileSection>

          {roundsShared > 0 ? (
            <ProfileSection title="Recent Rounds" description="Rounds you've shared in the feed.">
              <div
                className={`portal-profile-rounds${roundsShared === 1 ? " portal-profile-rounds--single" : ""}`}
              >
                {feedPosts.map((post, index) => (
                  <FeedCard key={post.id} post={post} index={index} />
                ))}
              </div>
            </ProfileSection>
          ) : null}
        </div>
      </article>
    </section>
  );
}
