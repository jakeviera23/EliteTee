import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MemberCard } from "../components/member-portal/MemberCard";
import { MemberProfileModalContent } from "../components/member-portal/MemberProfileModalContent";
import { PortalHome } from "../components/member-portal/PortalHome";
import { ProfileDossier } from "../components/member-portal/ProfileDossier";
import { RequestsBoard } from "../components/member-portal/RequestsBoard";
import { memberRequests, privacyCopy } from "../data/memberPortalDirectory";
import { fetchMemberProfiles } from "../lib/memberProfiles";
import { supabase } from "../lib/supabase";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import "../inside-elitetee.css";
import "../member-portal.css";

const INITIAL_LOADER_MS = 1800;
const TAB_TRANSITION_MS = 650;

type PortalTab = "home" | "members" | "requests" | "network" | "profile";

type PortalModal = { type: "intro" } | { type: "profile"; member: MemberProfileRecord };

const portalTabs: { id: PortalTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "members", label: "Members" },
  { id: "requests", label: "Requests" },
  { id: "network", label: "Network" },
  { id: "profile", label: "Profile" },
];

function matchesProfileSearch(member: MemberProfileRecord, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    member.full_name,
    member.based_in,
    ...member.regions,
    member.primary_club,
    ...member.additional_clubs,
    member.industry,
    ...member.golf_interests,
    ...member.business_interests,
    member.current_request,
    member.membership_status,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function MemberPortal() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInitialLoaderVisible, setIsInitialLoaderVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeView, setActiveView] = useState<PortalTab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<PortalModal | null>(null);
  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsInitialLoading(false), INITIAL_LOADER_MS);
    const hideTimer = window.setTimeout(
      () => setIsInitialLoaderVisible(false),
      INITIAL_LOADER_MS + 600,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (activeView !== "members") return;

    let active = true;
    setMembersLoading(true);
    setMembersError(null);

    fetchMemberProfiles().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setMembersError(error.message);
        setMembers([]);
      } else {
        setMembers(data ?? []);
      }

      setMembersLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeView]);

  const filteredMembers = useMemo(
    () => members.filter((member) => matchesProfileSearch(member, searchQuery)),
    [members, searchQuery],
  );

  const showLoader = isInitialLoaderVisible || isTransitioning;

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  function closeModal() {
    setModal(null);
  }

  function openIntroModal() {
    setModal({ type: "intro" });
  }

  function openProfileModal(member: MemberProfileRecord) {
    setModal({ type: "profile", member });
  }

  function transitionTo(view: PortalTab) {
    if (view === activeView) return;

    setIsTransitioning(true);
    window.setTimeout(() => {
      setActiveView(view);
      window.setTimeout(() => setIsTransitioning(false), TAB_TRANSITION_MS);
    }, TAB_TRANSITION_MS * 0.45);
  }

  function handleTabChange(tab: PortalTab) {
    transitionTo(tab);
  }

  function handleHomeSearchSubmit() {
    transitionTo("members");
  }

  return (
    <div className="inside-page portal-page">
      {showLoader ? (
        <div
          className={`portal-loader${isInitialLoading || isTransitioning ? "" : " is-fading"}`}
          aria-hidden="true"
        >
          <span className="inside-logo-mark portal-loader-logo" />
        </div>
      ) : null}

      <header className="portal-top">
        <button
          type="button"
          className="portal-logo-link"
          aria-label="EliteTee member portal home"
          onClick={() => transitionTo("home")}
        >
          <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </header>

      <nav className="portal-tabs" aria-label="Member portal sections">
        {portalTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-tab${activeView === tab.id ? " is-active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
            aria-current={activeView === tab.id ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={`portal-main${isInitialLoading ? " is-loading" : ""}`}>
        {activeView === "home" ? (
          <PortalHome
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleHomeSearchSubmit}
            onViewOpportunity={() => transitionTo("requests")}
          />
        ) : null}

        {activeView === "members" ? (
          <section className="portal-directory" aria-labelledby="members-heading">
            <header className="portal-section-head">
              <h2 id="members-heading">Discover Verified Members</h2>
              <p>Browse trusted private club members across the EliteTee network.</p>
            </header>
            <label className="portal-search-label">
              <span className="visually-hidden">Search members</span>
              <input
                type="search"
                className="portal-search-input"
                placeholder="Search members, clubs, industries, or locations..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            {membersLoading ? (
              <p className="portal-empty">Loading verified members...</p>
            ) : membersError ? (
              <p className="portal-alert portal-alert--error" role="alert">
                {membersError}
              </p>
            ) : members.length === 0 ? (
              <p className="portal-empty portal-empty--directory">
                No verified members have been added yet.
              </p>
            ) : (
              <>
                <ul className="portal-member-grid">
                  {filteredMembers.map((member) => (
                    <li key={member.id}>
                      <MemberCard
                        member={member}
                        onViewProfile={openProfileModal}
                        onRequest={() => openIntroModal()}
                      />
                    </li>
                  ))}
                </ul>
                {filteredMembers.length === 0 ? (
                  <p className="portal-empty">No members match your current search.</p>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {activeView === "requests" ? (
          <section className="portal-requests" aria-labelledby="requests-heading">
            <header className="portal-section-head">
              <h2 id="requests-heading">Active Member Requests</h2>
              <p>
                Private requests for golf access, travel connections, business introductions, and
                reciprocal hosting.
              </p>
            </header>
            <RequestsBoard requests={memberRequests} onRespond={openIntroModal} />
          </section>
        ) : null}

        {activeView === "network" ? (
          <section className="portal-network" aria-labelledby="network-heading">
            <header className="portal-section-head">
              <h2 id="network-heading">Private Member Network</h2>
              <p>Your approved introductions and active EliteTee relationships.</p>
            </header>
            <div className="portal-network-grid">
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Pending Introductions</h3>
                <p>3 introduction requests awaiting member approval.</p>
              </article>
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Active Connections</h3>
                <p>8 approved member introductions currently active.</p>
              </article>
              <article className="portal-panel-card portal-panel-card--network">
                <h3>Private Concierge</h3>
                <p>2 custom access requests currently being facilitated.</p>
              </article>
            </div>
          </section>
        ) : null}

        {activeView === "profile" ? (
          <section className="portal-profile" aria-labelledby="profile-heading">
            <header className="portal-section-head portal-section-head--profile">
              <h2 id="profile-heading">Member Profile</h2>
              <p>Your private member dossier within the EliteTee network.</p>
            </header>
            <ProfileDossier />
          </section>
        ) : null}

        <section className="portal-privacy">
          <p>{privacyCopy}</p>
        </section>
      </main>

      {modal ? (
        <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
          <button
            type="button"
            className="portal-modal-backdrop"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div
            className={`portal-modal-card${modal.type === "profile" ? " portal-modal-card--wide" : ""}`}
          >
            {modal.type === "intro" ? (
              <>
                <p className="portal-eyebrow">EliteTee Private Network</p>
                <h3 id="portal-modal-title">Member Introduction</h3>
                <p className="portal-modal-text">
                  Private member introductions and messaging coming soon.
                </p>
                <button type="button" className="portal-btn portal-btn--gold" onClick={closeModal}>
                  Close
                </button>
              </>
            ) : null}

            {modal.type === "profile" ? (
              <>
                <h3 id="portal-modal-title" className="visually-hidden">
                  {modal.member.full_name} full profile
                </h3>
                <MemberProfileModalContent member={modal.member} onRequest={openIntroModal} />
                <button
                  type="button"
                  className="portal-btn portal-btn--outline portal-modal-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
