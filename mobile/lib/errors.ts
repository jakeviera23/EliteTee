export function formatMobileError(message: string, fallback = "Something went wrong. Please try again.") {
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  return trimmed;
}
