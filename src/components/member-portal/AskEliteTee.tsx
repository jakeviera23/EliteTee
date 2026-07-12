import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ASK_ELITETEE_EXAMPLE_PROMPTS,
  askEliteTee,
  submitAskEliteTeeFeedback,
} from "../../lib/askEliteTee";
import { coerceProfileStringList } from "../../lib/memberProfiles";
import type { AiQueryStatus, AskEliteTeeMemberResult, AskEliteTeeResponse } from "../../types/askEliteTee";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { IntroductionRequestModal } from "./IntroductionRequestModal";
import { MemberCard } from "./MemberCard";
import { CourseSearchCard } from "./CourseSearchCard";
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

function statusLabel(status: AiQueryStatus): string | null {
  switch (status) {
    case "insufficient_data":
      return "Limited directory data";
    case "rate_limited":
      return "Daily limit reached";
    case "disabled":
      return "Temporarily unavailable";
    case "unsupported":
      return "Unsupported request";
    case "error":
      return "Could not complete";
    default:
      return null;
  }
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

  const reasonMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const reason of response?.reasons ?? []) {
      if (reason.target_type === "member") {
        map.set(reason.target_id, reason.signals);
      }
    }
    return map;
  }, [response?.reasons]);

  useEffect(() => {
    const trimmed = initialQuestion?.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    onInitialQuestionConsumed?.();
  }, [initialQuestion, onInitialQuestionConsumed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isActive) return;

    const trimmed = question.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setFeedbackRating(null);

    const { data, error } = await askEliteTee({ question: trimmed });
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data) {
      setErrorMessage("Ask EliteTee did not return a response.");
      return;
    }

    setResponse(data);
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

  const responseStatusLabel = response ? statusLabel(response.status) : null;

  return (
    <section
      className="et-ask et-theme-dark"
      data-et-theme="dark"
      aria-labelledby="ask-elitetee-heading"
    >
      <header className="et-ask-hero et-animate-fade-up">
        <p className="et-eyebrow et-eyebrow--line et-eyebrow--accent">Private Concierge</p>
        <h2 id="ask-elitetee-heading" className="et-h1">
          Ask EliteTee
        </h2>
        <p className="et-body-lg et-ask-lead">
          Member discovery, course discovery, and introduction suggestions — drawn only from
          EliteTee directory data. Nothing is invented.
        </p>
      </header>

      <div className="et-ask-prompts et-animate-fade-up et-animate-delay-1">
        <p className="et-label" id="ask-elitetee-prompts-label">
          Suggested questions
        </p>
        <div className="et-ask-prompts-list" aria-labelledby="ask-elitetee-prompts-label">
          {ASK_ELITETEE_EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={`et-chip${question === prompt ? " is-active" : ""}`}
              onClick={() => setQuestion(prompt)}
              aria-pressed={question === prompt}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <form
        className="et-ask-composer et-card et-card--spacious et-animate-fade-up et-animate-delay-2"
        onSubmit={handleSubmit}
        aria-busy={isLoading}
      >
        <div className="et-field">
          <label className="et-field__label" htmlFor="ask-elitetee-question">
            Your question
          </label>
          <textarea
            id="ask-elitetee-question"
            className="et-textarea et-ask-textarea"
            rows={4}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Who should I meet in Florida?"
            maxLength={500}
            required
            disabled={isLoading}
          />
          <p className="et-field__hint">{question.trim().length}/500 characters</p>
        </div>
        <div className="et-btn-group et-btn-group--stack-mobile">
          <button type="submit" className="et-btn et-btn--gold" disabled={isLoading || !question.trim()}>
            {isLoading ? "Searching…" : "Ask EliteTee"}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="et-loading et-ask-loading" aria-live="polite" aria-busy="true">
          <div className="et-loading__mark" aria-hidden="true" />
          <p className="et-loading__text">Searching EliteTee directory data</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="et-alert et-alert--error et-ask-alert" role="alert">
          <div>
            <p className="et-alert__title">Something went wrong</p>
            <p className="et-alert__body">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {response && !isLoading ? (
        <div className="et-ask-results et-stack et-stack-10 et-animate-fade-up">
          <article
            className={`et-card et-card--spacious et-ask-answer${
              response.status === "insufficient_data" ? " et-ask-answer--empty" : ""
            }${response.status === "ok" ? " et-ask-answer--success" : ""}`}
          >
            <div className="et-ask-answer-head">
              {responseStatusLabel ? (
                <span
                  className={`et-badge${
                    response.status === "ok"
                      ? " et-badge--gold"
                      : response.status === "insufficient_data"
                        ? ""
                        : " et-badge--error"
                  }`}
                >
                  {responseStatusLabel}
                </span>
              ) : (
                <span className="et-badge et-badge--gold">Concierge response</span>
              )}
            </div>
            <p className="et-ask-answer-text">{response.answer}</p>
            {response.sources.length > 0 ? (
              <div className="et-ask-sources" aria-label="Data sources">
                {response.sources.map((source) => (
                  <span key={source} className="et-badge et-badge--gold">
                    {source}
                  </span>
                ))}
              </div>
            ) : null}
            {response.status === "insufficient_data" ? (
              <p className="et-body-sm et-ask-note">
                Live external news and weather are not connected yet. Ask EliteTee uses member
                profiles, the course directory, and member review data only.
              </p>
            ) : null}
          </article>

          {response.members.length > 0 ? (
            <section className="et-ask-result-block" aria-labelledby="ask-elitetee-members">
              <div className="et-ask-result-head">
                <h3 id="ask-elitetee-members" className="et-h3">
                  Suggested members
                </h3>
                <p className="et-caption">{response.members.length} from EliteTee data</p>
              </div>
              <div className="et-ask-member-grid">
                {response.members.map((member) => {
                  const profile = toMemberProfileRecord(member);
                  const signals = reasonMap.get(member.user_id) ?? [];
                  return (
                    <div key={member.user_id} className="et-ask-member-shell et-hover-lift">
                      {signals.length > 0 ? (
                        <ul className="et-ask-signals" aria-label="Match signals">
                          {signals.map((signal) => (
                            <li key={signal}>
                              <span className="et-badge et-badge--verified">{signal}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <MemberCard
                        member={profile}
                        onViewProfile={handleViewProfile}
                        onRequest={setIntroMember}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {response.courses.length > 0 ? (
            <section className="et-ask-result-block" aria-labelledby="ask-elitetee-courses">
              <div className="et-ask-result-head">
                <h3 id="ask-elitetee-courses" className="et-h3">
                  Suggested courses
                </h3>
                <p className="et-caption">{response.courses.length} from EliteTee data</p>
              </div>
              <div className="et-ask-course-grid">
                {response.courses.map((course) => (
                  <div key={course.id} className="et-ask-course-shell et-hover-lift">
                    <CourseSearchCard
                      course={toCourseSearchResult(course)}
                      onOpen={(slug) => navigate(`/courses/${slug}`)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {response.query_id ? (
            <div className="et-card et-ask-feedback">
              <p className="et-label">Was this helpful?</p>
              <div className="et-ask-feedback-actions" role="group" aria-label="Rate this response">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`et-btn et-btn--sm et-btn--secondary${
                      feedbackRating === rating ? " et-ask-feedback-active" : ""
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
                <p className="et-caption et-ask-feedback-thanks" role="status">
                  Thank you — your feedback improves Ask EliteTee.
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
