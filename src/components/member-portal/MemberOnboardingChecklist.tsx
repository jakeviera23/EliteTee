import { useEffect, useMemo, useState } from "react";
import type { ComposerPostType } from "../../data/portalSocial";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { fetchIntroductionRequests } from "../../lib/introductionRequests";
import {
  buildMemberOnboardingSteps,
  countCompletedOnboardingSteps,
  type MemberOnboardingStepId,
} from "../../lib/memberOnboarding";
import { fetchMemberFeedPostsForCurrentUser } from "../../lib/memberFeedPosts";
import { fetchOwnMemberProfile } from "../../lib/memberProfiles";

type MemberOnboardingChecklistProps = {
  isActive: boolean;
  onNavigate: (tab: "profile" | "courses" | "introductions") => void;
  onCompose: (postType: ComposerPostType) => void;
};

const SESSION_KEY_PREFIX = "elitetee:onboarding-dismissed";

export function MemberOnboardingChecklist({
  isActive,
  onNavigate,
  onCompose,
}: MemberOnboardingChecklistProps) {
  const [steps, setSteps] = useState<ReturnType<typeof buildMemberOnboardingSteps>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    let active = true;

    async function loadChecklist() {
      setIsLoading(true);
      const [authResult, profileResult, postResult, introductionResult] = await Promise.all([
        getCurrentAuthUserId(),
        fetchOwnMemberProfile(),
        fetchMemberFeedPostsForCurrentUser(),
        fetchIntroductionRequests(),
      ]);
      if (!active) return;

      const userId = authResult.userId ?? null;
      setCurrentUserId(userId);
      if (userId) {
        try {
          setIsDismissed(window.sessionStorage.getItem(`${SESSION_KEY_PREFIX}:${userId}`) === "1");
        } catch {
          setIsDismissed(false);
        }
      }

      if (
        authResult.error ||
        profileResult.error ||
        postResult.error ||
        introductionResult.error
      ) {
        setSteps([]);
        setIsLoading(false);
        return;
      }

      setSteps(
        buildMemberOnboardingSteps({
          profile: profileResult.data,
          contributionCount: postResult.data.length,
          introductionRequests: introductionResult.data ?? [],
          currentUserId: userId,
        }),
      );
      setIsLoading(false);
    }

    void loadChecklist();
    return () => {
      active = false;
    };
  }, [isActive]);

  const completedCount = useMemo(() => countCompletedOnboardingSteps(steps), [steps]);
  if (isLoading || isDismissed || steps.length === 0 || completedCount === steps.length) return null;
  const isPartiallyComplete = completedCount > 0;
  const displayedSteps = isPartiallyComplete ? steps.filter((step) => !step.complete) : steps;

  function handleStep(stepId: MemberOnboardingStepId) {
    if (stepId === "profile" || stepId === "golf-identity") {
      onNavigate("profile");
    } else if (stepId === "saved-course") {
      onNavigate("courses");
    } else if (stepId === "contribution") {
      onCompose("introduction");
    } else {
      onNavigate("introductions");
    }
  }

  function dismissForSession() {
    if (currentUserId) {
      try {
        window.sessionStorage.setItem(`${SESSION_KEY_PREFIX}:${currentUserId}`, "1");
      } catch {
        // Session-only dismissal remains optional when storage is unavailable.
      }
    }
    setIsDismissed(true);
  }

  return (
    <section
      className={`et-onboarding${isPartiallyComplete ? " et-onboarding--compact" : ""}`}
      aria-labelledby="member-onboarding-heading"
    >
      <header className="et-onboarding-head">
        <div>
          <p className="et-onboarding-eyebrow">Your first session</p>
          <h3 id="member-onboarding-heading">Make EliteTee useful from day one.</h3>
          <p>{completedCount} of {steps.length} foundations complete.</p>
        </div>
        <button type="button" className="et-onboarding-dismiss" onClick={dismissForSession}>
          Dismiss for this session
        </button>
      </header>
      <ol className="et-onboarding-steps">
        {displayedSteps.map((step) => (
          <li key={step.id} className={step.complete ? "is-complete" : undefined}>
            <span className="et-onboarding-check" aria-hidden="true">{step.complete ? "✓" : ""}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
            {step.complete ? (
              <span className="et-onboarding-complete">Complete</span>
            ) : (
              <button type="button" onClick={() => handleStep(step.id)}>{step.actionLabel}</button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
