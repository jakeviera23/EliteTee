export function formatMobileError(message: string, fallback = "Something went wrong. Please try again.") {
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

export function isAuthError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("email not confirmed")
  );
}
