import { useCallback, useEffect, useMemo, useState } from "react";
import { earlyStageCopy, messagesCopy } from "../../data/portalSocial";
import { fetchMessageablePortalMembers } from "../../lib/memberProfiles";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { MemberClubAvatar } from "./MemberClubAvatar";

type NewConversationModalProps = {
  onClose: () => void;
  onStart: (receiverUserId: string, memberName: string) => void;
};

function memberMatchesSearch(member: MemberProfileRecord, query: string) {
  const haystack = [
    member.full_name,
    member.primary_club,
    member.based_in,
    member.founding_member_number ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function NewConversationModal({ onClose, onStart }: NewConversationModalProps) {
  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await fetchMessageablePortalMembers();

    if (error) {
      console.error("[NewConversationModal] failed to load members", {
        code: (error as { code?: string }).code,
        message: error.message,
      });
      setLoadError("Member profiles could not be loaded right now.");
      setMembers([]);
    } else {
      setMembers(data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) return members;
    return members.filter((member) => memberMatchesSearch(member, normalizedQuery));
  }, [members, search]);

  function handleSelect(member: MemberProfileRecord) {
    const receiverUserId = member.user_id?.trim();
    if (!receiverUserId) return;
    onStart(receiverUserId, member.full_name);
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-modal et-messages-modal"
        role="dialog"
        aria-labelledby="new-conversation-heading"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="new-conversation-heading">{messagesCopy.newConversation}</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label className="et-messages-modal-search">
          <span className="visually-hidden">Search members</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members…"
            disabled={isLoading || Boolean(loadError)}
          />
        </label>

        {isLoading ? (
          <p className="et-messages-loading">Loading members…</p>
        ) : null}

        {loadError ? (
          <p className="et-messages-alert" role="alert">
            {loadError}
          </p>
        ) : null}

        {!isLoading && !loadError && members.length === 0 ? (
          <div className="et-messages-empty">
            <p className="et-messages-empty-copy">{earlyStageCopy.messagesNewEmpty}</p>
          </div>
        ) : null}

        {!isLoading && !loadError && members.length > 0 && filteredMembers.length === 0 ? (
          <p className="et-messages-empty-copy">{earlyStageCopy.discoverNoMatch}</p>
        ) : null}

        {!isLoading && filteredMembers.length > 0 ? (
          <ul className="et-messages-modal-list">
            {filteredMembers.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  className="et-messages-modal-member"
                  onClick={() => handleSelect(member)}
                >
                  <MemberClubAvatar member={member} name={member.full_name} size="sm" />
                  <span>
                    <p className="et-messages-modal-member-name">{member.full_name}</p>
                    <p className="et-messages-modal-member-meta">
                      {[member.founding_member_number, member.primary_club, member.based_in]
                        .filter(Boolean)
                        .join(" · ") || "Founding member"}
                    </p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <footer className="et-messages-modal-footer">
          <button type="button" className="et-btn et-btn--secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </article>
    </div>
  );
}
