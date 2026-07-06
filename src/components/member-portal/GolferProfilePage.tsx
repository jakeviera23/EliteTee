import { useCallback, useEffect, useMemo, useState } from "react";
import { demoCourses, earlyStageCopy, type FeedPost } from "../../data/portalSocial";
import { photos } from "../../assets/photos";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";
import { getBucketListCourseIds } from "../../lib/portalCourseState";
import { buildGolferProfileDisplay } from "../../lib/portalProfileDisplay";
import { getPortalProfileExtras } from "../../lib/portalProfileExtras";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { ProfileDossier } from "./ProfileDossier";
import { VerifiedBadge } from "./VerifiedBadge";

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
  }, [isActive, isEditing, profileVersion, loadProfile]);

  useEffect(() => {
    if (!isActive) return;
    const refreshBucketList = () => setBucketListVersion((version) => version + 1);
    window.addEventListener("storage", refreshBucketList);
    window.addEventListener("focus", refreshBucketList);
    return () => {
      window.removeEventListener("storage", refreshBucketList);
      window.removeEventListener("focus", refreshBucketList);
    };
  }, [isActive]);

  const display = useMemo(() => {
    const extras = getPortalProfileExtras(memberProfile?.user_id);
    return buildGolferProfileDisplay(memberProfile, extras);
  }, [memberProfile]);

  const bucketListCourses = useMemo(() => {
    void bucketListVersion;
    const ids = getBucketListCourseIds();
    return demoCourses.filter((course) => ids.includes(course.id));
  }, [bucketListVersion]);

  const recentRounds = useMemo(() => {
    const memberId = memberProfile?.user_id ?? "member";
    return feedPosts.filter((post) => post.author.id === memberId);
  }, [feedPosts, memberProfile?.user_id]);

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
        <div
          className="portal-golfer-cover"
          style={{ backgroundImage: `url(${display.coverImage || photos.courseNationalGolfLinks})` }}
        >
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
              <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
            </div>
          </div>

          <dl className="portal-golfer-stats portal-golfer-stats--rich portal-golfer-stats--row">
            <div>
              <dt>Followers</dt>
              <dd>{display.followers}</dd>
            </div>
            <div>
              <dt>Following</dt>
              <dd>{display.following}</dd>
            </div>
            <div>
              <dt>Rounds</dt>
              <dd>{display.roundsPosted}</dd>
            </div>
            <div>
              <dt>Countries Played</dt>
              <dd>{display.countriesPlayed}</dd>
            </div>
            <div>
              <dt>Courses Played</dt>
              <dd>{display.coursesPlayed}</dd>
            </div>
            {display.handicap !== undefined ? (
              <div>
                <dt>Handicap</dt>
                <dd>{display.handicap}</dd>
              </div>
            ) : null}
          </dl>

          <p className="portal-profile-stats-note">{earlyStageCopy.profileStatsNote}</p>

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
                <p>Add favorite courses in Edit Profile.</p>
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
                <p>Add courses from the Courses page to build your list.</p>
              )}
            </section>
            <section className="portal-profile-card">
              <h3>Upcoming Trips</h3>
              <p>{display.upcomingTravel || "No upcoming trips posted yet."}</p>
            </section>
            <section className="portal-profile-card portal-profile-card--wide">
              <h3>Connections</h3>
              <p>{earlyStageCopy.connectionsEmpty}</p>
            </section>
            <section className="portal-profile-card portal-profile-card--wide">
              <h3>Recent Rounds</h3>
              {recentRounds.length > 0 ? (
                <ul className="portal-profile-photo-grid">
                  {recentRounds.map((post) => (
                    <li key={post.id}>
                      <img src={post.images[0]} alt={post.imageAlt} loading="lazy" decoding="async" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{earlyStageCopy.beAmongFirst}</p>
              )}
            </section>
            <section className="portal-profile-card portal-profile-card--wide">
              <h3>Achievements</h3>
              <p>{earlyStageCopy.achievementsEmpty}</p>
            </section>
          </div>
        </div>
      </article>
    </section>
  );
}
