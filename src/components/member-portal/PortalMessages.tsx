import { FormEvent, useMemo, useState } from "react";
import { FeedAvatar } from "./FeedAvatar";

type Message = {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  memberName: string;
  homeClub: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  messages: Message[];
};

type SuggestedMember = {
  id: string;
  name: string;
  homeClub: string;
  location: string;
};

const suggestedMembers: SuggestedMember[] = [
  { id: "member-wexford", name: "James Wexford", homeClub: "Piping Rock Club", location: "New York" },
  { id: "member-vance", name: "Charlotte Vance", homeClub: "Merion Golf Club", location: "Philadelphia" },
  { id: "member-holloway", name: "Marcus Holloway", homeClub: "Winged Foot Golf Club", location: "New York" },
  { id: "member-bennett", name: "Sofia Bennett", homeClub: "Kingston Heath Golf Club", location: "Melbourne" },
];

const initialConversations: Conversation[] = [
  {
    id: "conv-wexford",
    memberName: "James Wexford",
    homeClub: "Piping Rock Club",
    preview: "Playing in the Hamptons next month?",
    timestamp: "Today",
    unread: true,
    messages: [
      {
        id: "msg-w1",
        sender: "them",
        text: "Hope your season is off to a strong start.",
        timestamp: "Yesterday",
      },
      {
        id: "msg-w2",
        sender: "them",
        text: "Playing in the Hamptons next month? Would be great to get a round in if you're around.",
        timestamp: "Today",
      },
    ],
  },
  {
    id: "conv-vance",
    memberName: "Charlotte Vance",
    homeClub: "Merion Golf Club",
    preview: "Saw your round at National. Looks unreal.",
    timestamp: "Yesterday",
    unread: false,
    messages: [
      {
        id: "msg-v1",
        sender: "them",
        text: "Saw your round at National. Looks unreal.",
        timestamp: "Yesterday",
      },
      {
        id: "msg-v2",
        sender: "me",
        text: "Thank you — firm and fast, exactly how it should play in May.",
        timestamp: "Yesterday",
      },
    ],
  },
  {
    id: "conv-holloway",
    memberName: "Marcus Holloway",
    homeClub: "Winged Foot Golf Club",
    preview: "I'm heading to Palm Beach this winter.",
    timestamp: "2 days ago",
    unread: true,
    messages: [
      {
        id: "msg-h1",
        sender: "them",
        text: "I'm heading to Palm Beach this winter.",
        timestamp: "2 days ago",
      },
      {
        id: "msg-h2",
        sender: "them",
        text: "Seminole is the priority if we can make it happen.",
        timestamp: "2 days ago",
      },
    ],
  },
];

type PortalMessagesProps = {
  unreadCount?: number;
};

export function PortalMessages({ unreadCount: _unreadCount = 0 }: PortalMessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string>(initialConversations[0].id);
  const [draft, setDraft] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  const filteredMembers = useMemo(() => {
    const normalized = memberSearch.trim().toLowerCase();
    if (!normalized) return suggestedMembers;
    return suggestedMembers.filter((member) =>
      [member.name, member.homeClub, member.location].join(" ").toLowerCase().includes(normalized),
    );
  }, [memberSearch]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: false } : conversation,
      ),
    );
    setMobileShowThread(true);
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "me",
      text: draft.trim(),
      timestamp: "Just now",
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
              preview: draft.trim(),
              timestamp: "Just now",
              unread: false,
            }
          : conversation,
      ),
    );
    setDraft("");
  }

  function startConversation(member: SuggestedMember) {
    const existing = conversations.find((conversation) => conversation.memberName === member.name);
    if (existing) {
      selectConversation(existing.id);
    } else {
      const newConversation: Conversation = {
        id: `conv-${member.id}`,
        memberName: member.name,
        homeClub: member.homeClub,
        preview: "Start a new conversation",
        timestamp: "Just now",
        unread: false,
        messages: [],
      };
      setConversations((current) => [newConversation, ...current]);
      setSelectedId(newConversation.id);
      setMobileShowThread(true);
    }
    setShowNewModal(false);
    setMemberSearch("");
  }

  return (
    <section className="portal-social-page portal-messages-page" aria-labelledby="messages-heading">
      <header className="portal-section-head portal-section-head--social portal-messages-head portal-section-head--compact">
        <div>
          <h2 id="messages-heading">Messages</h2>
          <p>Connect through golf with members you follow.</p>
        </div>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-btn--compact"
          onClick={() => setShowNewModal(true)}
        >
          New Conversation
        </button>
      </header>

      <div className="portal-messages-layout messages-layout">
        <aside
          className={`portal-messages-sidebar messages-sidebar${mobileShowThread ? " is-hidden-mobile" : ""}`}
          aria-label="Conversations"
        >
          <ul className="portal-message-list messages-list">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`portal-message-card messages-conversation${selectedId === conversation.id ? " is-selected" : ""}`}
                  onClick={() => selectConversation(conversation.id)}
                  aria-current={selectedId === conversation.id ? "true" : undefined}
                >
                  <FeedAvatar name={conversation.memberName} size="sm" />
                  <div className="portal-message-copy">
                    <div className="portal-message-top">
                      <span className="portal-message-name">
                        {conversation.memberName}
                        {conversation.unread ? (
                          <span className="messages-unread-badge" aria-label="Unread">
                            1
                          </span>
                        ) : null}
                      </span>
                      <time>{conversation.timestamp}</time>
                    </div>
                    <p className="portal-message-club">{conversation.homeClub}</p>
                    <p
                      className={`portal-message-preview${conversation.unread ? " is-unread" : ""}`}
                    >
                      {conversation.preview}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div
          className={`portal-messages-panel messages-panel${mobileShowThread ? " is-visible-mobile" : ""}`}
          aria-label="Conversation"
        >
          {selected ? (
            <>
              <header className="portal-messages-panel-head messages-panel-head">
                <button
                  type="button"
                  className="messages-back-btn"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                >
                  ‹
                </button>
                <div>
                  <h3>{selected.memberName}</h3>
                  <p className="messages-panel-club">{selected.homeClub}</p>
                </div>
              </header>

              <ul className="portal-messages-thread messages-thread">
                {selected.messages.length > 0 ? (
                  selected.messages.map((message) => (
                    <li
                      key={message.id}
                      className={`portal-message-bubble portal-message-bubble--${message.sender === "me" ? "me" : "them"}`}
                    >
                      {message.text}
                      <time>{message.timestamp}</time>
                    </li>
                  ))
                ) : (
                  <li className="messages-thread-empty">
                    Start the conversation with a thoughtful note about golf, travel, or a shared
                    course.
                  </li>
                )}
              </ul>

              <form className="portal-messages-compose messages-compose" onSubmit={handleSend}>
                <label className="visually-hidden" htmlFor="message-compose-input">
                  Write a message
                </label>
                <input
                  id="message-compose-input"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a thoughtful message…"
                />
                <button type="submit" className="portal-btn portal-btn--gold portal-btn--compact">
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="messages-thread-empty">Select a conversation to continue.</p>
          )}
        </div>
      </div>

      {showNewModal ? (
        <div
          className="portal-modal-backdrop"
          role="presentation"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="portal-modal messages-modal"
            role="dialog"
            aria-labelledby="new-conversation-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="portal-modal-head">
              <h3 id="new-conversation-title">New Conversation</h3>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setShowNewModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <label className="messages-modal-search">
              <span className="visually-hidden">Search members</span>
              <input
                type="search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search members…"
              />
            </label>

            <ul className="messages-modal-list">
              {filteredMembers.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className="messages-modal-member"
                    onClick={() => startConversation(member)}
                  >
                    <FeedAvatar name={member.name} size="sm" />
                    <div>
                      <p className="messages-modal-member-name">{member.name}</p>
                      <p className="messages-modal-member-meta">
                        {member.homeClub} · {member.location}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <footer className="messages-modal-footer">
              <button
                type="button"
                className="portal-btn portal-btn--outline"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
