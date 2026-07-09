import { useCallback, useEffect, useMemo, useState } from "react";
import { demoCourses, earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { photos } from "../../assets/photos";
import { SafeImage } from "../SafeImage";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getBucketListCourseIds } from "../../lib/portalCourseState";
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

type GolferProfilePageProps = {
  isActive: boolean;
  feedPosts?: FeedPost[];
};

export function GolferProfilePage({ isActive, feedPosts = [] }: GolferProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [bucketListVersion, setBucketListVersion] = useState(0);
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
    const refreshBucketList = () => setBucketListVersion((version) => version + 1);
    refreshBucketList();
    window.addEventListener("storage", refreshBucketList);
    window.addEventListener("focus", refreshBucketList);
    window.addEventListener("elitetee:course-state-changed", refreshBucketList);
    return () => {
      window.removeEventListener("storage", refreshBucketList);
      window.removeEventListener("focus", refreshBucketList);
      window.removeEventListener("elitetee:course-state-changed", refreshBucketList);
    };
  }, [isActive]);

  const display = useMemo(() => {
    const extras = getPortalProfileExtras(memberProfile?.user_id);
    return buildGolferProfileDisplay(memberProfile, extras);
  }, [memberProfile, profileVersion]);

  const bucketListCourses = useMemo(() => {
    void bucketListVersion;
    const ids = getBucketListCourseIds();
    return demoCourses.filter((course) => ids.includes(course.id));
  }, [bucketListVersion]);

  const recentRounds = useMemo(() => feedPosts, [feedPosts]);

  if (isEditing) {
    return (
      <section className="portal-social-page portal-profile-page" aria-labelledby="profile-heading">
        <header className="portal-section-head portal-section-head--social portal-profile-edit-head">
          <div>
            <h2 id="profile-heading">Edit Profile</h2>
            <p>Update your golfer profile for the EliteTee member community.</p>
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
          <div className="portal-golfer-profile-header">
            <div className="portal-golfer-avatar-wrap">
              <MemberClubAvatar member={{ club_logo_url: display.avatarImage ?? null }} size="lg" />
            </div>
            <div className="portal-golfer-profile-identity">
              <h2>
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

          <p className="portal-profile-intro-note">{earlyStageCopy.beAmongFirst}</p>

          <dl className="portal-profile-stats-grid">
            <div className="portal-profile-stat">
              <dt>Followers</dt>
              <dd>{display.followers}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Following</dt>
              <dd>{display.following}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Rounds</dt>
              <dd>{display.roundsPosted}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Countries Played</dt>
              <dd>{display.countriesPlayed}</dd>
            </div>
            <div className="portal-profile-stat">
              <dt>Courses Played</dt>
              <dd>{display.coursesPlayed}</dd>
            </div>
            {display.handicap !== undefined ? (
              <div className="portal-profile-stat">
                <dt>Handicap</dt>
                <dd>{display.handicap}</dd>
              </div>
            ) : null}
          </dl>

          <div className="portal-profile-cards">
            <section className="portal-profile-card">
              <h3>Bio</h3>
              <p>{display.bio}</p>
            </section>
            <section className="portal-profile-card">
              <h3>Home Course</h3>
              <p>{display.homeCourse || "Add your home course in Edit Profile."}</p>
            </section>
            <section className="portal-profile-card">
              <h3>Favorite Courses</h3>
              {display.favoriteCourses.length > 0 ? (
                <ul>
                  {display.favoriteCourses.map((course) => (
                    <li key={course}>{course}</li>
                  ))}
                </ul>
              ) : (
                <ProfileEmptyState
                  title={earlyStageCopy.favoriteCoursesEmpty}
                  hint="Add the courses that define your game in Edit Profile."
                />
              )}
            </section>
            <section className="portal-profile-card">
              <h3>Course List</h3>
              {bucketListCourses.length > 0 ? (
                <ul>
                  {bucketListCourses.map((course) => (
                    <li key={course.id}>
                      {course.name} · {course.location}
                    </li>
                  ))}
                </ul>
              ) : (
                <ProfileEmptyState
                  title="No saved courses yet"
                  hint="Save courses from the Courses page to build your bucket list."
                />
              )}
            </section>
            <section className="portal-profile-card">
              <h3>Upcoming Trips</h3>
              {display.upcomingTravel ? (
                <p>{display.upcomingTravel}</p>
              ) : (
                <ProfileEmptyState
                  title={earlyStageCopy.tripsEmpty}
                  hint="Share where you're playing next in Edit Profile to connect with members traveling nearby."
                />
              )}
            </section>
            <section className="portal-profile-card">
              <h3>Connections</h3>
              <ProfileEmptyState
                title={earlyStageCopy.connectionsEmpty}
                hint="Connections will appear as founding members join and you start playing together."
              />
            </section>
            <section className="portal-profile-card portal-profile-card--wide">
              <h3>Recent Rounds</h3>
              {recentRounds.length > 0 ? (
                <div
                  className={`portal-profile-rounds${recentRounds.length === 1 ? " portal-profile-rounds--single" : ""}`}
                >
                  {recentRounds.map((post, index) => (
                    <FeedCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              ) : (
                <ProfileEmptyState
                  title={earlyStageCopy.roundsEmpty}
                  hint="Post from the Feed to share where you've been playing."
                />
              )}
            </section>
            <section className="portal-profile-card portal-profile-card--wide">
              <h3>Achievements</h3>
              <ProfileEmptyState
                title={earlyStageCopy.achievementsEmpty}
                hint="Milestones will appear as you share rounds and participate in the community."
              />
            </section>
          </div>
        </div>
      </article>
    </section>
  );
}
