export function formatMembershipLabel(status: string) {
  const normalized = status.trim();

  if (normalized === "Verified Member") return "Verified";
  if (normalized === "Founding Member") return "Founding Member";

  return status;
}
