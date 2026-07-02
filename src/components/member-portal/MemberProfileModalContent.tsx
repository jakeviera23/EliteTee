import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  coerceProfileStringList,
  displayProfileText,
  normalizeMemberProfileRecord,
} from "../../lib/memberProfiles";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import { MemberIdentity } from "./MemberClubAvatar";

type MemberProfileModalContentProps = {
  member: MemberProfileRecord;
  onRequest: (member: MemberProfileRecord) => void;
};

const EMPTY_FIELD_LABEL = "Not specified";

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-dossier-block">
      <h4>{label}</h4>
      <p className={value === EMPTY_FIELD_LABEL ? "portal-dossier-empty" : undefined}>{value}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: unknown }) {
  const normalizedItems = coerceProfileStringList(items);

  return (
    <div className="portal-dossier-block">
      <h4>{label}</h4>
      {normalizedItems.length === 0 ? (
        <p className="portal-dossier-empty">{EMPTY_FIELD_LABEL}</p>
      ) : (
        <ul>
          {normalizedItems.map((item) => (
            <li key={`${label}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberProfileModalBody({ member, onRequest }: MemberProfileModalContentProps) {
  const safeMember = normalizeMemberProfileRecord(member as unknown as Record<string, unknown>);
  const membershipLine =
    safeMember.membership_status === "Founding Member"
      ? "EliteTee Founding Member"
      : formatMembershipLabel(displayProfileText(safeMember.membership_status, "Club Verified"));

  if (!safeMember.full_name.trim()) {
    return (
      <p className="portal-alert portal-alert--error" role="alert">
        This dossier could not be displayed because required profile details are missing.
      </p>
    );
  }

  return (
    <div className="portal-profile-modal">
      <header className="portal-dossier-header portal-dossier-header--identity">
        <MemberIdentity member={safeMember} size="lg" heading="h3" />
        <p className="portal-dossier-membership">{membershipLine}</p>
        {safeMember.is_verified ? <p className="portal-dossier-verified">Club Verified · Private</p> : null}
      </header>
      <div className="portal-dossier-body">
        <TextBlock label="Primary Club" value={displayProfileText(safeMember.primary_club)} />
        <ListBlock label="Additional Clubs" items={safeMember.additional_clubs} />
        <TextBlock label="Based In" value={displayProfileText(safeMember.based_in)} />
        <TextBlock label="Traveling To" value={displayProfileText(safeMember.traveling_to)} />
        <ListBlock label="Regions" items={safeMember.regions} />
        <TextBlock label="Industry" value={displayProfileText(safeMember.industry)} />
        <ListBlock label="Golf Interests" items={safeMember.golf_interests} />
        <ListBlock label="Business Interests" items={safeMember.business_interests} />
        <TextBlock label="Currently Seeking" value={displayProfileText(safeMember.current_request)} />
      </div>
      <button type="button" className="portal-btn portal-btn--gold" onClick={() => onRequest(safeMember)}>
        Request Private Introduction
      </button>
    </div>
  );
}

type DossierErrorBoundaryState = {
  hasError: boolean;
};

class DossierErrorBoundary extends Component<{ children: ReactNode }, DossierErrorBoundaryState> {
  state: DossierErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MemberProfileModalContent]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="portal-alert portal-alert--error" role="alert">
          This dossier could not be displayed. Please close and try again.
        </p>
      );
    }

    return this.props.children;
  }
}

export function MemberProfileModalContent(props: MemberProfileModalContentProps) {
  return (
    <DossierErrorBoundary>
      <MemberProfileModalBody {...props} />
    </DossierErrorBoundary>
  );
}
