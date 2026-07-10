import {
  formatPlayedOnDate,
  getMemberInitials,
} from "../../lib/memberCourseRounds";
import type { MemberCourseRoundRecord } from "../../types/memberCourseRound";

type MemberActivityListProps = {
  rounds: MemberCourseRoundRecord[];
  emptyMessage?: string;
};

export function MemberActivityList({ rounds, emptyMessage }: MemberActivityListProps) {
  if (rounds.length === 0) {
    return emptyMessage ? <p className="courses-signals-early-copy">{emptyMessage}</p> : null;
  }

  return (
    <ul className="courses-activity-list">
      {rounds.map((round) => {
        const memberName = round.member_name ?? "Member";
        return (
          <li key={round.id} className="courses-activity-item">
            <div className="courses-activity-head">
              <span className="courses-activity-avatar" aria-hidden="true">
                {getMemberInitials(memberName)}
              </span>
              <div>
                <p className="courses-activity-member">{memberName}</p>
                <p className="courses-activity-name">{round.course_name}</p>
              </div>
            </div>
            <p className="courses-activity-meta">
              {round.location} · {formatPlayedOnDate(round.played_on)}
            </p>
            {round.note.trim() ? <p className="courses-activity-note">{round.note}</p> : null}
            <p className="courses-activity-again">
              Would play again: {round.would_play_again ? "Yes" : "No"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
