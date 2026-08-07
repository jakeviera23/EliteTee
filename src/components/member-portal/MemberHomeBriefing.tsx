import { useEffect } from "react";
import type { ComposerPostType, FeedPost } from "../../data/portalSocial";
import { getMemberPrimaryClub } from "../../lib/discoverDirectory";
import {
  buildMemberHomeActivityDigest,
  buildMemberHomeCourseSignals,
  getFoundingMemberEditorialPrompt,
  selectMemberHomePulse,
  selectMemberHomeRecommendation,
  type MemberHomeExposure,
} from "../../lib/memberHome";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { ClubMark } from "./ClubMark";
import { DiscoverMemberAvatar } from "./discover/DiscoverMemberAvatar";
import {
  buildContributionResponseAction,
  type ContributionResponseAction,
} from "../../lib/contributionResponse";

type MemberHomeBriefingProps = {
  posts: FeedPost[];
  members: MemberProfileRecord[];
  viewer: MemberProfileRecord | null;
  viewerUserId: string | null;
  previousVisitAt: string | null;
  exposure: MemberHomeExposure;
  isLoading: boolean;
  onCompose: (postType: ComposerPostType, initialMessage?: string) => void;
  onOpenPost: (postId: string) => void;
  onNavigateDiscover: () => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onRespondToPost?: (post: FeedPost, response: ContributionResponseAction) => void;
  onRecordExposure?: (exposure: { postId?: string; memberId?: string }) => void;
};

export function MemberHomeBriefing({
  posts,
  members,
  viewer,
  viewerUserId,
  previousVisitAt,
  exposure,
  isLoading,
  onCompose,
  onOpenPost,
  onNavigateDiscover,
  onViewMemberProfile,
  onRespondToPost,
  onRecordExposure,
}: MemberHomeBriefingProps) {
  const digest = buildMemberHomeActivityDigest(posts, previousVisitAt);
  const recommendation = selectMemberHomeRecommendation(members, viewer, exposure.memberIds);
  const pulse = selectMemberHomePulse(posts, viewerUserId, exposure.postIds);
  const courses = buildMemberHomeCourseSignals(posts, 2);
  const spotlight = pulse?.post ?? null;
  const spotlightResponse = spotlight
    ? buildContributionResponseAction(spotlight, viewerUserId)
    : null;
  const editorialPrompt = getFoundingMemberEditorialPrompt();

  useEffect(() => {
    if (isLoading || !onRecordExposure) return;
    onRecordExposure({
      postId: pulse?.post.id,
      memberId: recommendation?.member.user_id ?? undefined,
    });
  }, [isLoading, onRecordExposure, pulse?.post.id, recommendation?.member.user_id]);

  function viewRecommendedMember() {
    const member = recommendation?.member;
    const userId = member?.user_id?.trim();
    if (!member || !userId || !onViewMemberProfile) return;
    onViewMemberProfile(userId, member.full_name);
  }

  const recommendedPrimaryClub = recommendation
    ? getMemberPrimaryClub(recommendation.member)
    : "";

  return (
    <section className="et-member-home" aria-labelledby="member-home-briefing-heading">
      <header className="et-member-home-briefing">
        <p className="et-member-home-kicker">
          {digest.hasPreviousVisit ? "Since your last visit" : "Your member briefing"}
        </p>
        <h3 id="member-home-briefing-heading">{isLoading ? "Gathering what’s new…" : digest.headline}</h3>
        <p>
          {isLoading
            ? "Reviewing the latest member activity without delaying the conversation below."
            : digest.summary}
        </p>
        {!isLoading && digest.postCount > 0 ? (
          <dl className="et-member-home-stats" aria-label="Recent member activity">
            <div>
              <dt>Updates</dt>
              <dd>{digest.postCount}</dd>
            </div>
            <div>
              <dt>Members</dt>
              <dd>{digest.memberCount}</dd>
            </div>
            {digest.courseCount > 0 ? (
              <div>
                <dt>Courses</dt>
                <dd>{digest.courseCount}</dd>
              </div>
            ) : null}
            {digest.photoCount > 0 ? (
              <div>
                <dt>Photos</dt>
                <dd>{digest.photoCount}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </header>

      {!isLoading && (recommendation || spotlight || courses.length > 0) ? (
        <div className="et-member-home-signals">
          {recommendation ? (
            <article className="et-member-home-signal et-member-home-signal--member">
              <p className="et-member-home-signal-label">Worth meeting</p>
              <div className="et-member-home-member-row">
                <DiscoverMemberAvatar member={recommendation.member} size="md" />
                <div>
                  <h3>{recommendation.member.full_name}</h3>
                  {recommendedPrimaryClub ? (
                    <p className="et-member-home-member-club">{recommendedPrimaryClub}</p>
                  ) : null}
                  {recommendation.member.based_in.trim() ? (
                    <p className="et-member-home-member-location">
                      {recommendation.member.based_in.trim()}
                    </p>
                  ) : null}
                </div>
              </div>
              {recommendation.reason ? (
                <p className="et-member-home-reason">{recommendation.reason}</p>
              ) : null}
              <div className="et-member-home-signal-actions">
                {onViewMemberProfile ? (
                  <button type="button" onClick={viewRecommendedMember}>
                    View profile
                  </button>
                ) : null}
                <button type="button" onClick={onNavigateDiscover}>
                  Discover members
                </button>
              </div>
            </article>
          ) : null}

          {spotlight ? (
            <article className="et-member-home-signal">
              <p className="et-member-home-signal-label">
                {pulse?.label}
              </p>
              <h3>{spotlight.courseName || spotlight.requestLabel || "Member update"}</h3>
              <p className="et-member-home-signal-meta">
                {spotlight.author.name}
                {spotlight.courseLocation ? ` · ${spotlight.courseLocation}` : ""}
              </p>
              <p className="et-member-home-signal-copy">{spotlight.caption}</p>
              {pulse?.reason ? <p className="et-member-home-reason">{pulse.reason}</p> : null}
              <div className="et-member-home-signal-actions">
                {spotlightResponse && onRespondToPost ? (
                  <button type="button" onClick={() => onRespondToPost(spotlight, spotlightResponse)}>
                    {spotlightResponse.label}
                  </button>
                ) : null}
                <button type="button" onClick={() => onOpenPost(spotlight.id)}>
                  Join conversation
                </button>
              </div>
            </article>
          ) : null}

          {courses.length > 0 ? (
            <article className="et-member-home-signal">
              <p className="et-member-home-signal-label">Courses members are sharing</p>
              <ul className="et-member-home-courses">
                {courses.map((course) => (
                  <li key={course.name}>
                    <button type="button" onClick={() => onOpenPost(course.postId)}>
                      <ClubMark name={course.name} size="sm" />
                      <span>
                        <strong>{course.name}</strong>
                        <small>
                          {course.mentions > 1
                            ? `${course.mentions} recent mentions`
                            : course.location || "Recent member experience"}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}

      <section className="et-member-home-contribute" aria-labelledby="member-home-contribute-heading">
        <div>
          <p className="et-member-home-signal-label">The founding conversation</p>
          <h3 id="member-home-contribute-heading">{editorialPrompt}</h3>
          <p>One considered answer can give every member a reason to return.</p>
        </div>
        <div className="et-member-home-contribute-actions">
          <button
            type="button"
            className="et-member-home-contribute-primary"
            onClick={() => onCompose("general", `${editorialPrompt}\n\nMy perspective: `)}
          >
            Add your perspective
          </button>
          <button
            type="button"
            className="et-member-home-contribute-secondary"
            onClick={() => onCompose("round-review")}
          >
            Share a round
          </button>
        </div>
      </section>
    </section>
  );
}
