export function formatMembershipLabel(status: string) {
  const normalized = status.trim();

  if (normalized === "Verified Member") return "Club Verified";
  if (normalized === "Founding Member") return "Founding Member";

  return status;
}
