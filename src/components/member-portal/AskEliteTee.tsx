import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ASK_ELITETEE_EXAMPLE_PROMPTS,
  askEliteTee,
  submitAskEliteTeeFeedback,
} from "../../lib/askEliteTee";
import { coerceProfileStringList } from "../../lib/memberProfiles";
import type { AskEliteTeeMemberResult, AskEliteTeeResponse } from "../../types/askEliteTee";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { IntroductionRequestModal } from "./IntroductionRequestModal";
import { MemberCard } from "./MemberCard";
import { CourseSearchCard } from "./CourseSearchCard";
import { usePortalToast } from "./PortalToastProvider";

type AskEliteTeeProps = {
  isActive?: boolean;
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

export function AskEliteTee({ isActive = true, onViewMemberProfile }: AskEliteTeeProps) {
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

  return (
    <section className="portal-social-page portal-ask-page" aria-labelledby="ask-elitetee-heading">
      <header className="portal-section-head portal-section-head--social">
        <h2 id="ask-elitetee-heading">Ask EliteTee</h2>
        <p>
          Private concierge for member discovery, course discovery, and introduction suggestions.
          Recommendations use EliteTee directory data only.
        </p>
      </header>

      <div className="portal-ask-examples" aria-label="Example questions">
        {ASK_ELITETEE_EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="portal-ask-example-chip"
            onClick={() => setQuestion(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="portal-ask-form" onSubmit={handleSubmit}>
        <label className="portal-ask-field">
          <span>Your question</span>
          <textarea
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Who should I meet in Florida?"
            maxLength={500}
            required
          />
        </label>
        <button type="submit" className="portal-btn portal-btn--gold" disabled={isLoading}>
          {isLoading ? "Searching EliteTee data…" : "Ask EliteTee"}
        </button>
      </form>

      {errorMessage ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {response ? (
        <div className="portal-ask-results">
          <article className="portal-ask-answer-card">
            <p className="portal-ask-answer">{response.answer}</p>
            {response.sources.length > 0 ? (
              <div className="portal-ask-sources">
                {response.sources.map((source) => (
                  <span key={source} className="portal-ask-source-badge">
                    {source}
                  </span>
                ))}
              </div>
            ) : null}
            {response.status === "insufficient_data" ? (
              <p className="portal-ask-note">
                Current external live news and weather are not connected yet. Ask EliteTee uses
                member profiles, course directory, and member review data only.
              </p>
            ) : null}
          </article>

          {response.members.length > 0 ? (
            <section className="portal-ask-result-section">
              <h3>Suggested members</h3>
              <div className="portal-member-grid">
                {response.members.map((member) => {
                  const profile = toMemberProfileRecord(member);
                  const signals = reasonMap.get(member.user_id) ?? [];
                  return (
                    <div key={member.user_id} className="portal-ask-member-wrap">
                      {signals.length > 0 ? (
                        <ul className="portal-ask-reason-list">
                          {signals.map((signal) => (
                            <li key={signal}>{signal}</li>
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
            <section className="portal-ask-result-section">
              <h3>Suggested courses</h3>
              <div className="portal-ask-course-grid">
                {response.courses.map((course) => (
                  <CourseSearchCard
                    key={course.id}
                    course={toCourseSearchResult(course)}
                    onOpen={(slug) => navigate(`/courses/${slug}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {response.query_id ? (
            <div className="portal-ask-feedback">
              <span>Was this helpful?</span>
              <div className="portal-ask-feedback-actions">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`portal-btn portal-btn--outline portal-btn--compact${feedbackRating === rating ? " is-active" : ""}`}
                    onClick={() => void handleFeedback(rating)}
                  >
                    {rating}
                  </button>
                ))}
              </div>
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
