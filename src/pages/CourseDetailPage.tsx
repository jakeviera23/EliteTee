import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { experienceCopy } from "../data/portalSocial";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CourseDetailGallery } from "../components/member-portal/course-detail/CourseDetailGallery";
import { CourseDetailMembersPlayed } from "../components/member-portal/course-detail/CourseDetailMembersPlayed";
import { CourseDetailReviewCards } from "../components/member-portal/course-detail/CourseDetailReviewCards";
import { AddCoursePlayedModal } from "../components/member-portal/AddCoursePlayedModal";
import { EditMemberSubmittedCourseModal } from "../components/member-portal/EditMemberSubmittedCourseModal";
import { BucketListToggleButton } from "../components/member-portal/BucketListToggleButton";
import { CourseDirectoryCard } from "../components/member-portal/CourseDirectoryCard";
import { CourseImage } from "../components/member-portal/CourseImage";
import { IntroductionRequestModal } from "../components/member-portal/IntroductionRequestModal";
import { usePortalToast } from "../components/member-portal/PortalToastProvider";
import {
  buildCourseAskPrompts,
  buildCourseGalleryPhotos,
  buildMemberPlaySummaries,
  formatLatestActivityAt,
} from "../lib/courseDetail";
import { buildCourseDetailFacts, formatArchitectYearLine } from "../lib/courseDetailFacts";
import {
  formatCourseRatingDisplay,
  formatMemberRatingSummary,
} from "../lib/courseRating";
import { fetchRelatedCourses } from "../lib/courseRelatedCourses";
import { fetchGolfCourseBySlug } from "../lib/golfCourses";
import {
  fetchMemberCourseRoundsForCourse,
} from "../lib/memberCourseRounds";
import {
  fetchApprovedMemberProfilesByUserIds,
  type ApprovedMemberDirectoryProfile,
} from "../lib/memberProfiles";
import { ensureBucketListHydrated, getBucketListCourseIds } from "../lib/portalCourseState";
import type { GolfCourseRecord, GolfCourseSearchResult } from "../types/golfCourse";
import { formatGolfCourseLocation, isMemberSubmittedCourse } from "../types/golfCourse";
import type { MemberCourseRoundRecord } from "../types/memberCourseRound";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import type { ViewMemberProfileHandler } from "../types/memberProfileNavigation";
import "../inside-elitetee.css";
import "../member-portal.css";
import "../member-portal-theme.css";
import "../member-portal-courses.css";
import "../member-portal-course-detail.css";

type CourseDetailPageProps = {
  onMessageMember?: (userId: string, memberName: string) => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

function formatRecommendLabel(value: number | null | undefined, roundCount: number) {
  if (roundCount === 0 || value === null || value === undefined) {
    return "No recommend data yet";
  }
  return `${Math.round(value)}% would play again`;
}

function formatCountLabel(value: number, singular: string, plural: string, emptyLabel: string) {
  if (value <= 0) return emptyLabel;
  return `${value} ${value === 1 ? singular : plural}`;
}

export function CourseDetailPage({ onMessageMember, onViewMemberProfile }: CourseDetailPageProps) {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const membersSectionRef = useRef<HTMLElement | null>(null);
  const { showToast } = usePortalToast();

  const [course, setCourse] = useState<GolfCourseRecord | null>(null);
  const [rounds, setRounds] = useState<MemberCourseRoundRecord[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<ApprovedMemberDirectoryProfile[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<GolfCourseSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [canEditSubmittedCourse, setCanEditSubmittedCourse] = useState(false);
  const [introMember, setIntroMember] = useState<MemberProfileRecord | null>(null);
  const [bucketListCourseIds, setBucketListCourseIds] = useState<string[]>(() =>
    getBucketListCourseIds(),
  );

  const loadCourse = useCallback(async () => {
    if (!slug.trim()) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setLoadError(null);

    const { data, error } = await fetchGolfCourseBySlug(slug);

    if (error) {
      setCourse(null);
      setRounds([]);
      setMemberProfiles([]);
      setRelatedCourses([]);
      setNotFound(false);
      setLoadError(error.message || "Course could not be loaded.");
      setIsLoading(false);
      return;
    }

    if (!data) {
      setCourse(null);
      setRounds([]);
      setMemberProfiles([]);
      setRelatedCourses([]);
      setNotFound(true);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setCourse(data);
    // Edit button is only for member-submitted courses; permission is enforced server-side.
    setCanEditSubmittedCourse(false);

    const [{ data: courseRounds }, related] = await Promise.all([
      fetchMemberCourseRoundsForCourse({ golfCourseId: data.id }),
      fetchRelatedCourses(data),
    ]);

    const nextRounds = courseRounds ?? [];
    setRounds(nextRounds);
    setRelatedCourses(related);

    const memberIds = [...new Set(nextRounds.map((round) => round.member_user_id))];
    if (memberIds.length > 0) {
      const { data: profiles } = await fetchApprovedMemberProfilesByUserIds(memberIds);
      setMemberProfiles(profiles ?? []);
    } else {
      setMemberProfiles([]);
    }

    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    let active = true;
    async function loadEditPermission() {
      if (!course?.id) return;
      if (!(course.source_name === "member_submitted" || course.submitted_by_member)) {
        setCanEditSubmittedCourse(false);
        return;
      }

      const { canEditMemberSubmittedCourse } = await import("../lib/memberSubmittedCourses");
      const { data, error } = await canEditMemberSubmittedCourse(course.id);
      if (!active) return;

      if (error) {
        console.error("[CourseDetailPage] edit permission check failed", error.message);
        setCanEditSubmittedCourse(false);
        showToast("Could not verify edit permissions for this course.");
        return;
      }

      setCanEditSubmittedCourse(Boolean(data));
    }
    void loadEditPermission();
    return () => {
      active = false;
    };
  }, [course?.id, course?.source_name, course?.submitted_by_member, showToast]);

  useEffect(() => {
    void ensureBucketListHydrated().then(() => {
      setBucketListCourseIds(getBucketListCourseIds());
    });

    function handleBucketListChanged() {
      setBucketListCourseIds(getBucketListCourseIds());
    }

    window.addEventListener("elitetee:course-state-changed", handleBucketListChanged);

    return () => {
      window.removeEventListener("elitetee:course-state-changed", handleBucketListChanged);
    };
  }, []);

  const profilesByUserId = useMemo(() => {
    const map: Record<string, ApprovedMemberDirectoryProfile> = {};
    for (const profile of memberProfiles) {
      if (profile.user_id) {
        map[profile.user_id] = profile;
      }
    }
    return map;
  }, [memberProfiles]);

  const memberSummaries = useMemo(() => buildMemberPlaySummaries(rounds), [rounds]);
  const galleryPhotos = useMemo(
    () => (course ? buildCourseGalleryPhotos(course, rounds) : []),
    [course, rounds],
  );
  const askPrompts = useMemo(
    () => (course ? buildCourseAskPrompts(course.name) : []),
    [course],
  );

  function handleAskAboutCourse(question: string) {
    navigate("/member-portal", {
      state: { openAskWith: { question } },
    });
  }

  function scrollToMembers() {
    membersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isLoading) {
    return (
      <div className="inside-page portal-page portal-page--social et-theme-portal">
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
      <div className="inside-page portal-page portal-page--social et-theme-portal">
        <main className="portal-main portal-main--social">
          <div className="portal-shell">
            <section className="portal-social-page">
              <h2>{loadError ? "Course unavailable" : "Course not found"}</h2>
              {loadError ? (
                <p>We couldn’t load this course right now. Please try again.</p>
              ) : (
                <p>This course is not in the EliteTee library yet.</p>
              )}
              <Link
                to="/member-portal"
                state={{ restorePortalTab: "courses" }}
                className="portal-btn portal-btn--outline"
              >
                Back to Courses
              </Link>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const location = formatGolfCourseLocation(course);
  const roundCount = course.round_count ?? 0;
  const memberCount = course.member_count ?? 0;
  const isMemberSubmitted = isMemberSubmittedCourse(course);
  const hasHeroImage = Boolean(course.image_url?.trim());
  const architectYear = formatArchitectYearLine(course.architect, course.year_opened);
  const courseDetailFacts = buildCourseDetailFacts(course);
  const memberRating =
    course.avg_rating !== null && course.avg_rating !== undefined && roundCount > 0
      ? formatMemberRatingSummary(course.avg_rating, roundCount)
      : null;
  const ratingDisplay =
    course.avg_rating !== null && course.avg_rating !== undefined && roundCount > 0
      ? formatCourseRatingDisplay(course.avg_rating)
      : null;
  const latestActivity = formatLatestActivityAt(course.latest_activity_at);

  return (
    <div className="inside-page portal-page portal-page--social et-theme-portal">
      <main className="portal-main portal-main--social">
        <div className="portal-shell">
          <article className="et-course-detail" aria-labelledby="course-detail-heading">
            <button
              type="button"
              className="et-course-detail-back"
              onClick={() =>
                navigate("/member-portal", { state: { restorePortalTab: "courses" } })
              }
            >
              ← Back to Courses
            </button>

            <header
              className={`et-course-detail-hero${hasHeroImage ? "" : " et-course-detail-hero--no-image"}`}
            >
              {hasHeroImage ? (
                <div className="et-course-detail-hero-media">
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
                </div>
              ) : null}
              <div className="et-course-detail-hero-body">
                <p className="et-course-detail-eyebrow">Course Profile</p>
                <h1 id="course-detail-heading" className="et-course-detail-title">
                  {course.name}
                </h1>
                {location ? (
                  <p className="et-course-detail-location">{location}</p>
                ) : (
                  <p className="et-course-detail-location">Location details not available</p>
                )}
                {architectYear ? (
                  <p className="et-course-detail-architect-year">{architectYear}</p>
                ) : null}

                <div className="et-course-detail-hero-meta">
                  {isMemberSubmitted ? (
                    <span className="et-course-detail-pill et-course-detail-pill--member">
                      Member submitted
                    </span>
                  ) : null}
                  {course.course_type ? (
                    <span className="et-course-detail-pill">{course.course_type}</span>
                  ) : null}
                  {course.access_type ? (
                    <span className="et-course-detail-pill">{course.access_type}</span>
                  ) : null}
                </div>

                <dl className="et-course-detail-hero-stats">
                  <div className="et-course-detail-hero-stat et-course-detail-hero-stat--rating">
                    <dt>Average rating</dt>
                    <dd>{ratingDisplay ?? "No rating yet"}</dd>
                  </div>
                  <div className="et-course-detail-hero-stat">
                    <dt>Members played</dt>
                    <dd>{formatCountLabel(memberCount, "member", "members", "None yet")}</dd>
                  </div>
                  <div className="et-course-detail-hero-stat">
                    <dt>Rounds shared</dt>
                    <dd>{formatCountLabel(roundCount, "round", "rounds", "None yet")}</dd>
                  </div>
                  <div className="et-course-detail-hero-stat">
                    <dt>Would play again</dt>
                    <dd>{formatRecommendLabel(course.recommend_pct ?? null, roundCount)}</dd>
                  </div>
                </dl>
              </div>
            </header>

            <div className="et-course-detail-actions">
              <button
                type="button"
                className="et-btn et-btn--forest"
                onClick={() => setShowAddModal(true)}
              >
                {experienceCopy.shareTitle}
              </button>
              <BucketListToggleButton courseId={course.id} variant="et-secondary" />
              {canEditSubmittedCourse ? (
                <button
                  type="button"
                  className="et-btn et-btn--ghost"
                  onClick={() => setShowEditCourseModal(true)}
                >
                  Edit course
                </button>
              ) : null}
              {memberSummaries.length > 0 ? (
                <button type="button" className="et-btn et-btn--secondary" onClick={scrollToMembers}>
                  View Members Who Played
                </button>
              ) : null}
              <button
                type="button"
                className="et-btn et-btn--secondary"
                onClick={() => handleAskAboutCourse(askPrompts[0] ?? `Who has played ${course.name}?`)}
              >
                Ask EliteTee About This Course
              </button>
              {onMessageMember && memberSummaries.length === 1 ? (
                <button
                  type="button"
                  className="et-btn et-btn--ghost"
                  onClick={() =>
                    onMessageMember(
                      memberSummaries[0]!.memberUserId,
                      memberSummaries[0]!.memberName,
                    )
                  }
                >
                  Message Member
                </button>
              ) : null}
            </div>

            <div className="et-course-detail-layout">
              <div className="et-course-detail-main">
                <section className="et-course-detail-section" aria-labelledby="course-summary-heading">
                  <h2 id="course-summary-heading" className="et-course-detail-section-title">
                    About this course
                  </h2>
                  {course.description?.trim() ? (
                    <p className="et-course-detail-summary">{course.description}</p>
                  ) : (
                    <div className="et-course-detail-empty">
                      <p className="et-course-detail-empty-title">No course description on file</p>
                      <p className="et-course-detail-empty-copy">
                        EliteTee shows stored library descriptions only — nothing is invented here.
                      </p>
                    </div>
                  )}
                  {course.image_attribution ? (
                    <p className="et-course-detail-attribution">Photo: {course.image_attribution}</p>
                  ) : null}
                </section>

                <section className="et-course-detail-section" aria-labelledby="course-stats-heading">
                  <h2 id="course-stats-heading" className="et-course-detail-section-title">
                    Member intelligence
                  </h2>
                  <p className="et-course-detail-section-lead">
                    Aggregated from EliteTee member rounds and reviews.
                  </p>
                  <dl className="et-course-detail-stats-grid">
                    <div className="et-course-detail-stat-card et-course-detail-stat-card--rating">
                      <dt>Average rating</dt>
                      <dd>{memberRating?.score ?? "No rating yet"}</dd>
                    </div>
                    <div className="et-course-detail-stat-card">
                      <dt>Members played</dt>
                      <dd>{memberCount > 0 ? memberCount : "None yet"}</dd>
                    </div>
                    <div className="et-course-detail-stat-card">
                      <dt>Rounds shared</dt>
                      <dd>{roundCount > 0 ? roundCount : "None yet"}</dd>
                    </div>
                    <div className="et-course-detail-stat-card">
                      <dt>Recommend</dt>
                      <dd>{formatRecommendLabel(course.recommend_pct ?? null, roundCount)}</dd>
                    </div>
                    <div className="et-course-detail-stat-card">
                      <dt>Latest activity</dt>
                      <dd>{latestActivity ?? "No activity yet"}</dd>
                    </div>
                    {memberRating?.detail ? (
                      <div className="et-course-detail-stat-card">
                        <dt>Rating basis</dt>
                        <dd>{memberRating.detail}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                <section className="et-course-detail-section" aria-labelledby="course-gallery-heading">
                  <h2 id="course-gallery-heading" className="et-course-detail-section-title">
                    Photography
                  </h2>
                  <CourseDetailGallery photos={galleryPhotos} />
                </section>

                <section className="et-course-detail-section" aria-labelledby="course-reviews-heading">
                  <h2 id="course-reviews-heading" className="et-course-detail-section-title">
                    Member reviews
                  </h2>
                  <CourseDetailReviewCards
                    rounds={rounds}
                    profilesByUserId={profilesByUserId}
                    emptyOnAdd={() => setShowAddModal(true)}
                    onRoundsChanged={() => void loadCourse()}
                    onViewMemberProfile={onViewMemberProfile}
                  />
                </section>

                <section
                  ref={membersSectionRef}
                  id="course-detail-members"
                  className="et-course-detail-section"
                  aria-labelledby="course-members-heading"
                >
                  <h2 id="course-members-heading" className="et-course-detail-section-title">
                    Members who played
                  </h2>
                  <CourseDetailMembersPlayed
                    summaries={memberSummaries}
                    profilesByUserId={profilesByUserId}
                    onViewMemberProfile={onViewMemberProfile}
                    onRequestIntroduction={setIntroMember}
                    onAddPlayed={() => setShowAddModal(true)}
                  />
                </section>

                {relatedCourses.length > 0 ? (
                  <section className="et-course-detail-section" aria-labelledby="course-related-heading">
                    <h2 id="course-related-heading" className="et-course-detail-section-title">
                      Related courses
                    </h2>
                    <p className="et-course-detail-section-lead">
                      Matched by country, region, type, access, and member rating proximity.
                    </p>
                    <ul className="et-course-detail-related-grid">
                      {relatedCourses.map((related) => (
                        <li key={related.id}>
                          <CourseDirectoryCard
                            course={related}
                            onOpen={(relatedSlug) => navigate(`/courses/${relatedSlug}`)}
                            isOnBucketList={bucketListCourseIds.includes(related.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>

              <aside className="et-course-detail-aside">
                {courseDetailFacts.length > 0 ? (
                  <section
                    className="et-course-detail-section"
                    aria-labelledby="course-details-heading"
                  >
                    <h2 id="course-details-heading" className="et-course-detail-section-title">
                      Course details
                    </h2>
                    <dl className="et-course-detail-facts">
                      {courseDetailFacts.map((fact) => (
                        <div key={fact.label}>
                          <dt>{fact.label}</dt>
                          <dd>
                            {fact.label === "Website" ? (
                              <a href={fact.value} target="_blank" rel="noreferrer noopener">
                                Visit course website
                              </a>
                            ) : (
                              fact.value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                <section className="et-course-detail-section" aria-labelledby="course-location-heading">
                  <h2 id="course-location-heading" className="et-course-detail-section-title">
                    Location & classification
                  </h2>
                  <dl className="et-course-detail-facts">
                    <div>
                      <dt>City</dt>
                      <dd>{course.city?.trim() || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Region</dt>
                      <dd>{course.region?.trim() || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Country</dt>
                      <dd>{course.country?.trim() || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Course type</dt>
                      <dd>{course.course_type?.trim() || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Access</dt>
                      <dd>{course.access_type?.trim() || "Not specified"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="et-course-detail-section" aria-labelledby="course-ask-heading">
                  <h2 id="course-ask-heading" className="et-course-detail-section-title">
                    Ask EliteTee
                  </h2>
                  <p className="et-course-detail-section-lead">
                    Private concierge answers from EliteTee directory data only.
                  </p>
                  <div className="et-course-detail-ask-prompts" role="group" aria-label="Suggested questions">
                    {askPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="et-course-detail-ask-chip"
                        onClick={() => handleAskAboutCourse(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="et-btn et-btn--forest"
                    onClick={() => handleAskAboutCourse(askPrompts[0] ?? `Who has played ${course.name}?`)}
                  >
                    Open Ask EliteTee
                  </button>
                </section>
              </aside>
            </div>
          </article>
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

      {showEditCourseModal ? (
        <EditMemberSubmittedCourseModal
          course={course}
          onClose={() => setShowEditCourseModal(false)}
          onSaved={() => {
            showToast("Refreshing course…");
            void loadCourse();
          }}
        />
      ) : null}

      {introMember ? (
        <IntroductionRequestModal
          member={introMember}
          onClose={() => setIntroMember(null)}
          onSubmitted={() => setIntroMember(null)}
        />
      ) : null}
    </div>
  );
}
