import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { askCopy } from "../../data/portalSocial";
import {
  ASK_ELITETEE_EXAMPLE_PROMPTS,
  askEliteTee,
  submitAskEliteTeeFeedback,
} from "../../lib/askEliteTee";
import {
  buildAskReasonMaps,
  collectUniqueMatchSignals,
  getAskAnswerText,
  getAskStatusLabel,
  memberFacingAskError,
} from "../../lib/askEliteTeeDisplay";
import { coerceProfileStringList } from "../../lib/memberProfiles";
import type { AskEliteTeeMemberResult, AskEliteTeeResponse } from "../../types/askEliteTee";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { CourseDirectoryCard } from "./CourseDirectoryCard";
import { DiscoverDirectoryCard } from "./discover/DiscoverDirectoryCard";
import { IntroductionRequestModal } from "./IntroductionRequestModal";
import { usePortalToast } from "./PortalToastProvider";

type AskEliteTeeProps = {
  isActive?: boolean;
  initialQuestion?: string | null;
  onInitialQuestionConsumed?: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

function toMemberProfileRecord(member: AskEliteTeeMemberResult): MemberProfileRecord {
  return {
    id: member.user_id,
    user_id: member.user_id,
    full_name: member.full_name,
    email: "",
    primary_club: member.primary_club,
    additional_clubs: [],
    based_in: member.based_in,
    regions: coerceProfileStringList(member.regions),
    industry: member.industry,
    golf_interests: coerceProfileStringList(member.golf_interests),
    business_interests: coerceProfileStringList(member.business_interests),
    current_request: member.current_request,
    traveling_to: member.traveling_to,
    club_logo_url: member.club_logo_url,
    cover_photo_url: member.cover_photo_url,
    membership_status: "Founding Member",
    is_verified: member.is_verified,
    founding_member_number: member.founding_member_number,
    portal_access_enabled: true,
    handicap: "",
    bucket_list_course_ids: [],
    created_at: "",
    updated_at: "",
  };
}

function toCourseSearchResult(course: AskEliteTeeResponse["courses"][number]): GolfCourseSearchResult {
  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    city: course.city,
    region: course.region,
    country: course.country,
    course_type: course.course_type,
    access_type: course.access_type,
    description: course.description,
    round_count: course.round_count,
    member_count: course.member_count,
    recommend_pct: course.recommend_pct,
    avg_rating: course.avg_rating,
    latest_activity_at: course.latest_activity_at,
  };
}

export function AskEliteTee({
  isActive = true,
  initialQuestion = null,
  onInitialQuestionConsumed,
  onViewMemberProfile,
}: AskEliteTeeProps) {
  const navigate = useNavigate();
  const { showToast } = usePortalToast();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskEliteTeeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [introMember, setIntroMember] = useState<MemberProfileRecord | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  const { memberMap, courseMap } = useMemo(
    () => buildAskReasonMaps(response?.reasons ?? []),
    [response?.reasons],
  );

  const uniqueMatchSignals = useMemo(
    () => collectUniqueMatchSignals(response?.reasons ?? []),
    [response?.reasons],
  );

  useEffect(() => {
    const trimmed = initialQuestion?.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    onInitialQuestionConsumed?.();
  }, [initialQuestion, onInitialQuestionConsumed]);

  async function submitQuestion(trimmed: string) {
    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setFeedbackRating(null);

    const { data, error } = await askEliteTee({ question: trimmed });
    setIsLoading(false);

    if (error) {
      console.error("[Ask EliteTee]", error);
      setErrorMessage(memberFacingAskError(error.message));
      return;
    }

    if (!data) {
      setErrorMessage(memberFacingAskError("Ask EliteTee did not return a response."));
      return;
    }

    setResponse(data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isActive) return;

    const trimmed = question.trim();
    if (!trimmed) return;

    await submitQuestion(trimmed);
  }

  async function handleRetry() {
    const trimmed = question.trim();
    if (!trimmed || !isActive) return;
    await submitQuestion(trimmed);
  }

  async function handleFeedback(rating: number) {
    if (!response?.query_id) return;
    setFeedbackRating(rating);
    const { error } = await submitAskEliteTeeFeedback({
      queryId: response.query_id,
      rating,
    });
    if (error) {
      showToast("Could not save feedback");
      setFeedbackRating(null);
      return;
    }
    showToast("Thanks for the feedback");
  }

  function handleViewProfile(member: MemberProfileRecord) {
    if (onViewMemberProfile && member.user_id) {
      onViewMemberProfile(member.user_id, member.full_name);
      return;
    }
    navigate(`/members/${member.user_id}`);
  }

  const responseStatusLabel = response ? getAskStatusLabel(response.status) : null;
  const answerText = response ? getAskAnswerText(response.status, response.answer) : "";

  return (
    <section className="et-ask" aria-labelledby="ask-elitetee-heading">
      <header className="et-ask-header">
        <p className="et-ask-eyebrow">{askCopy.eyebrow}</p>
        <h2 id="ask-elitetee-heading" className="et-ask-title">
          {askCopy.title}
        </h2>
        <p className="et-ask-tagline">{askCopy.tagline}</p>
        <p className="et-ask-lead">{askCopy.lead}</p>
      </header>

      <div className="et-ask-prompts">
        <p className="et-ask-prompts-label" id="ask-elitetee-prompts-label">
          {askCopy.suggestedLabel}
        </p>
        <div className="et-ask-prompts-list" aria-labelledby="ask-elitetee-prompts-label">
          {ASK_ELITETEE_EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={`et-ask-prompt${question === prompt ? " is-active" : ""}`}
              onClick={() => setQuestion(prompt)}
              aria-pressed={question === prompt}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <form className="et-ask-composer" onSubmit={handleSubmit} aria-busy={isLoading}>
        <div className="et-ask-field">
          <label className="et-ask-field-label" htmlFor="ask-elitetee-question">
            {askCopy.composeLabel}
          </label>
          <textarea
            id="ask-elitetee-question"
            className="et-ask-textarea"
            rows={4}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={askCopy.composePlaceholder}
            maxLength={500}
            required
            disabled={isLoading}
          />
          <p className="et-ask-field-hint">{question.trim().length}/500 characters</p>
        </div>
        <div className="et-ask-composer-actions">
          <button
            type="submit"
            className="et-btn et-btn--forest et-ask-submit"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? askCopy.submitting : askCopy.submit}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="et-ask-loading" aria-live="polite" aria-busy="true">
          <div className="et-ask-loading-mark" aria-hidden="true" />
          <p className="et-ask-loading-text">{askCopy.loading}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="et-ask-alert" role="alert">
          <div className="et-ask-alert-copy">
            <p className="et-ask-alert-title">{askCopy.errorTitle}</p>
            <p className="et-ask-alert-body">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="et-btn et-btn--secondary et-ask-retry"
            onClick={() => void handleRetry()}
            disabled={isLoading || !question.trim()}
          >
            {askCopy.retry}
          </button>
        </div>
      ) : null}

      {response && !isLoading ? (
        <div className="et-ask-results">
          <article
            className={`et-ask-answer${
              response.status === "insufficient_data" ? " et-ask-answer--limited" : ""
            }${response.status === "ok" ? " et-ask-answer--success" : ""}`}
          >
            <div className="et-ask-answer-head">
              {responseStatusLabel ? (
                <span
                  className={`et-ask-status${
                    response.status === "ok"
                      ? " et-ask-status--ok"
                      : response.status === "insufficient_data"
                        ? " et-ask-status--muted"
                        : " et-ask-status--error"
                  }`}
                >
                  {responseStatusLabel}
                </span>
              ) : (
                <span className="et-ask-status et-ask-status--ok">{askCopy.answerEyebrow}</span>
              )}
            </div>
            <p className="et-ask-answer-text">{answerText}</p>
            {response.status === "insufficient_data" ? (
              <div className="et-ask-next-steps">
                <p className="et-ask-next-steps-label">Helpful next steps</p>
                <ul className="et-ask-next-steps-list">
                  {askCopy.insufficientNextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <p className="et-ask-note">{askCopy.insufficientNote}</p>
              </div>
            ) : null}
          </article>

          {response.members.length > 0 ? (
            <section className="et-ask-section" aria-labelledby="ask-elitetee-members">
              <div className="et-ask-section-head">
                <h3 id="ask-elitetee-members" className="et-ask-section-title">
                  {askCopy.membersTitle}
                </h3>
                <p className="et-ask-section-meta">{askCopy.membersMeta(response.members.length)}</p>
              </div>
              <div className="et-ask-member-grid">
                {response.members.map((member) => {
                  const profile = toMemberProfileRecord(member);
                  return (
                    <DiscoverDirectoryCard
                      key={member.user_id}
                      member={profile}
                      viewer={null}
                      matchReasonsOverride={memberMap.get(member.user_id) ?? []}
                      onViewProfile={handleViewProfile}
                      onRequestIntroduction={setIntroMember}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          {response.courses.length > 0 ? (
            <section className="et-ask-section" aria-labelledby="ask-elitetee-courses">
              <div className="et-ask-section-head">
                <h3 id="ask-elitetee-courses" className="et-ask-section-title">
                  {askCopy.coursesTitle}
                </h3>
                <p className="et-ask-section-meta">{askCopy.coursesMeta(response.courses.length)}</p>
              </div>
              <div className="et-ask-course-grid">
                {response.courses.map((course) => {
                  const signals = courseMap.get(course.id) ?? [];
                  return (
                    <div key={course.id} className="et-ask-course-item">
                      {signals.length > 0 ? (
                        <ul className="et-ask-course-reasons" aria-label="Match reasons">
                          {signals.map((signal) => (
                            <li key={signal}>
                              <span className="et-discover-reason">{signal}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <CourseDirectoryCard
                        course={toCourseSearchResult(course)}
                        onOpen={(slug) => navigate(`/courses/${slug}`)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {uniqueMatchSignals.length > 0 ? (
            <section className="et-ask-match" aria-labelledby="ask-elitetee-match">
              <h3 id="ask-elitetee-match" className="et-ask-section-title">
                {askCopy.matchTitle}
              </h3>
              <ul className="et-ask-match-list" aria-label={askCopy.matchTitle}>
                {uniqueMatchSignals.map((signal) => (
                  <li key={signal}>
                    <span className="et-discover-reason">{signal}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {response.sources.length > 0 ? (
            <div className="et-ask-sources" aria-label={askCopy.sourcesLabel}>
              <p className="et-ask-sources-label">{askCopy.sourcesLabel}</p>
              <div className="et-ask-sources-list">
                {response.sources.map((source) => (
                  <span key={source} className="et-ask-source">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {response.query_id ? (
            <div className="et-ask-feedback">
              <p className="et-ask-feedback-label">{askCopy.feedbackLabel}</p>
              <div className="et-ask-feedback-actions" role="group" aria-label={askCopy.feedbackLabel}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`et-ask-feedback-btn${
                      feedbackRating === rating ? " is-selected" : ""
                    }`}
                    onClick={() => void handleFeedback(rating)}
                    aria-pressed={feedbackRating === rating}
                    aria-label={`Rate ${rating} out of 5`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              {feedbackRating ? (
                <p className="et-ask-feedback-thanks" role="status">
                  {askCopy.feedbackThanks}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {introMember ? (
        <IntroductionRequestModal
          member={introMember}
          onClose={() => setIntroMember(null)}
          onSubmitted={() => {
            showToast("Introduction request submitted");
            setIntroMember(null);
          }}
        />
      ) : null}
    </section>
  );
}
