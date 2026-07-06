export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span className="portal-verified-pill" title={label}>
      <svg viewBox="0 0 16 16" aria-hidden="true" className="portal-verified-pill-icon">
        <path
          d="M3.5 8.2 6.4 11 12.5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
