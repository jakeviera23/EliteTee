import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatMemberRatingSummary } from "../lib/courseRating";
import { fetchGolfCourseBySlug } from "../lib/golfCourses";
import {
  fetchMemberCourseRoundsForCourse,
  formatPlayedOnDate,
  getMemberInitials,
} from "../lib/memberCourseRounds";
import type { GolfCourseRecord } from "../types/golfCourse";
import { formatGolfCourseLocation, isMemberSubmittedCourse } from "../types/golfCourse";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";
import type { ViewMemberProfileHandler } from "../types/memberProfileNavigation";
import { AddCoursePlayedModal } from "../components/member-portal/AddCoursePlayedModal";
import { CourseMemberPhotosSection } from "../components/member-portal/CourseMemberPhotosSection";
import { CourseImage } from "../components/member-portal/CourseImage";
import { MemberActivityList } from "../components/member-portal/MemberActivityList";
import "../inside-elitetee.css";
import "../member-portal.css";

type CourseDetailPageProps = {
  onMessageMember?: (userId: string, memberName: string) => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

function CourseDetailEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="golf-course-detail-empty">
      <p className="golf-course-detail-empty-title">
        No EliteTee member has shared a round here yet.
      </p>
      <button type="button" className="portal-btn portal-btn--gold" onClick={onAdd}>
        Be the first to add one
      </button>
    </div>
  );
}

export function CourseDetailPage({ onMessageMember, onViewMemberProfile }: CourseDetailPageProps) {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const [course, setCourse] = useState<GolfCourseRecord | null>(null);
  const [rounds, setRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!slug.trim()) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotFound(false);

    const { data, error } = await fetchGolfCourseBySlug(slug);

    if (error || !data) {
      setCourse(null);
      setRounds([]);
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setCourse(data);

    const { data: courseRounds } = await fetchMemberCourseRoundsForCourse({
      golfCourseId: data.id,
    });
    setRounds(courseRounds ?? []);
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  if (isLoading) {
    return (
      <div className="inside-page portal-page portal-page--social">
        <main className="portal-main portal-main--social">
          <div className="portal-shell">
            <p className="portal-discover-loading">Loading course…</p>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="inside-page portal-page portal-page--social">
        <main className="portal-main portal-main--social">
          <div className="portal-shell">
            <section className="portal-social-page">
              <h2>Course not found</h2>
              <p>This course is not in the EliteTee library yet.</p>
              <Link to="/member-portal" className="portal-btn portal-btn--outline">
                Back to portal
              </Link>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const location = formatGolfCourseLocation(course);
  const uniqueMembers = [...new Map(rounds.map((round) => [round.member_user_id, round])).values()];
  const hasActivity = rounds.length > 0;
  const roundCount = course.round_count ?? 0;
  const memberCount = course.member_count ?? 0;
  const isMemberSubmitted = isMemberSubmittedCourse(course);
  const memberRating =
    course.avg_rating !== null && course.avg_rating !== undefined && roundCount > 0
      ? formatMemberRatingSummary(course.avg_rating, roundCount)
      : null;

  return (
    <div className="inside-page portal-page portal-page--social">
      <main className="portal-main portal-main--social">
        <div className="portal-shell portal-shell--course-detail">
          <section className="portal-social-page golf-course-detail-page" aria-labelledby="course-detail-heading">
            <header className="golf-course-detail-hero-block">
              <CourseImage
                name={course.name}
                city={course.city}
                region={course.region}
                country={course.country}
                imageUrl={course.image_url}
                thumbnailUrl={course.thumbnail_url}
                golfCourseId={course.id}
                variant="hero"
                overlay
                loading="eager"
              />
              <div className="golf-course-detail-hero-copy">
                <button
                  type="button"
                  className="golf-course-detail-back"
                  onClick={() => navigate("/member-portal")}
                >
                  ← Back to Courses
                </button>
                <p className="portal-courses-eyebrow">Course Library</p>
                <h1 id="course-detail-heading">{course.name}</h1>
                {location ? <p className="golf-course-detail-location">{location}</p> : null}
              </div>
            </header>

            <div className="golf-course-detail-grid">
              <section className="golf-course-detail-panel" aria-labelledby="course-facts-heading">
                <h2 id="course-facts-heading" className="golf-course-detail-section-title">
                  Course Profile
                </h2>
                <dl className="golf-course-detail-fact-grid">
                  {isMemberSubmitted ? (
                    <div>
                      <dt>Source</dt>
                      <dd>Member submitted</dd>
                    </div>
                  ) : null}
                  {course.access_type ? (
                    <div>
                      <dt>Access</dt>
                      <dd>{course.access_type}</dd>
                    </div>
                  ) : null}
                  {course.course_type ? (
                    <div>
                      <dt>Type</dt>
                      <dd>{course.course_type}</dd>
                    </div>
                  ) : null}
                  {course.holes ? (
                    <div>
                      <dt>Holes</dt>
                      <dd>{course.holes}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Members</dt>
                    <dd>{memberCount > 0 ? memberCount : "None yet"}</dd>
                  </div>
                  <div>
                    <dt>Rounds</dt>
                    <dd>{roundCount > 0 ? roundCount : "None yet"}</dd>
                  </div>
                  {course.recommend_pct !== null && course.recommend_pct !== undefined ? (
                    <div>
                      <dt>Recommend</dt>
                      <dd>{Math.round(course.recommend_pct)}% would play again</dd>
                    </div>
                  ) : null}
                </dl>

                {memberRating ? (
                  <div className="golf-course-detail-member-rating">
                    <p className="golf-course-detail-member-rating-label">Overall Member Rating</p>
                    <p className="golf-course-detail-member-rating-score">{memberRating.score}</p>
                    <p className="golf-course-detail-member-rating-detail">{memberRating.detail}</p>
                  </div>
                ) : null}

                {course.website_url ? (
                  <p className="golf-course-detail-website">
                    <a href={course.website_url} target="_blank" rel="noreferrer noopener">
                      Visit course website
                    </a>
                  </p>
                ) : null}

                {course.description ? (
                  <p className="golf-course-detail-description">{course.description}</p>
                ) : null}

                {course.image_attribution ? (
                  <p className="golf-course-detail-attribution">Photo: {course.image_attribution}</p>
                ) : null}

                <button
                  type="button"
                  className="portal-btn portal-btn--gold"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Course Played
                </button>
              </section>

              <section className="golf-course-detail-panel" aria-labelledby="course-members-heading">
                <h2 id="course-members-heading" className="golf-course-detail-section-title">
                  Members Who Have Played
                </h2>
                {uniqueMembers.length > 0 ? (
                  <ul className="golf-course-detail-members">
                    {uniqueMembers.map((round) => (
                      <li key={round.member_user_id}>
                        <div className="golf-course-detail-member">
                          {onViewMemberProfile ? (
                            <button
                              type="button"
                              className="golf-course-detail-member-link"
                              onClick={() =>
                                onViewMemberProfile(
                                  round.member_user_id,
                                  round.member_name ?? "Member",
                                )
                              }
                            >
                              <span className="courses-activity-avatar" aria-hidden="true">
                                {getMemberInitials(round.member_name ?? "Member")}
                              </span>
                              <div>
                                <p>{round.member_name ?? "Member"}</p>
                                <p className="golf-course-detail-member-meta">
                                  Played {formatPlayedOnDate(round.played_on)}
                                </p>
                              </div>
                            </button>
                          ) : (
                            <>
                              <span className="courses-activity-avatar" aria-hidden="true">
                                {getMemberInitials(round.member_name ?? "Member")}
                              </span>
                              <div>
                                <p>{round.member_name ?? "Member"}</p>
                                <p className="golf-course-detail-member-meta">
                                  Played {formatPlayedOnDate(round.played_on)}
                                </p>
                              </div>
                            </>
                          )}
                          {onMessageMember ? (
                            <button
                              type="button"
                              className="portal-btn portal-btn--outline portal-btn--compact"
                              onClick={() =>
                                onMessageMember(round.member_user_id, round.member_name ?? "Member")
                              }
                            >
                              Message
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <CourseDetailEmptyState onAdd={() => setShowAddModal(true)} />
                )}
              </section>
            </div>

            <section className="golf-course-detail-panel" aria-labelledby="course-member-photos-heading">
              <h2 id="course-member-photos-heading" className="golf-course-detail-section-title">
                Member Photos
              </h2>
              <CourseMemberPhotosSection
                rounds={rounds}
                isLoading={isLoading}
                onViewMemberProfile={onViewMemberProfile}
              />
            </section>

            <section className="golf-course-detail-panel" aria-labelledby="course-reviews-heading">
              <h2 id="course-reviews-heading" className="golf-course-detail-section-title">
                Member Notes
              </h2>
              {hasActivity ? (
                <MemberActivityList
                  rounds={rounds}
                  emptyMessage="No EliteTee member has shared a round here yet."
                  allowPhotoDelete
                  onRoundsChanged={() => void loadCourse()}
                  onViewMemberProfile={onViewMemberProfile}
                />
              ) : (
                <CourseDetailEmptyState onAdd={() => setShowAddModal(true)} />
              )}
            </section>

            <section className="golf-course-detail-panel" aria-labelledby="course-recent-heading">
              <h2 id="course-recent-heading" className="golf-course-detail-section-title">
                Recent Activity
              </h2>
              {hasActivity ? (
                <MemberActivityList
                  rounds={rounds.slice(0, 4)}
                  onViewMemberProfile={onViewMemberProfile}
                />
              ) : (
                <CourseDetailEmptyState onAdd={() => setShowAddModal(true)} />
              )}
            </section>
          </section>
        </div>
      </main>

      {showAddModal ? (
        <AddCoursePlayedModal
          initialCourse={{
            golf_course_id: course.id,
            course_name: course.name,
            location,
          }}
          onClose={() => setShowAddModal(false)}
          onSubmitted={() => {
            void loadCourse();
          }}
        />
      ) : null}
    </div>
  );
}
