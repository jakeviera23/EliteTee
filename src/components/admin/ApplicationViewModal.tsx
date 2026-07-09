import type { MembershipApplicationRecord } from "../../types/membershipApplication";

type ApplicationViewModalProps = {
  application: MembershipApplicationRecord;
  onClose: () => void;
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ApplicationViewModal({ application, onClose }: ApplicationViewModalProps) {
  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="portal-modal portal-modal--application"
        role="dialog"
        aria-labelledby="application-view-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h3 id="application-view-title">Membership Application</h3>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <dl className="admin-application-details">
          <div>
            <dt>Name</dt>
            <dd>{application.full_name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{application.email}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{application.location}</dd>
          </div>
          <div>
            <dt>Home Course</dt>
            <dd>{application.home_club}</dd>
          </div>
          {application.handicap ? (
            <div>
              <dt>Handicap</dt>
              <dd>{application.handicap}</dd>
            </div>
          ) : null}
          {application.instagram ? (
            <div>
              <dt>Instagram</dt>
              <dd>{application.instagram}</dd>
            </div>
          ) : null}
          <div>
            <dt>Applied</dt>
            <dd>{formatDate(application.applied_at)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="admin-application-status">{application.status.replace("_", " ")}</dd>
          </div>
          <div className="admin-application-details-wide">
            <dt>What they love about golf</dt>
            <dd>{application.golf_love}</dd>
          </div>
          <div className="admin-application-details-wide">
            <dt>Why they want to join</dt>
            <dd>{application.why_join}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
