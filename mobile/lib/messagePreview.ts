export function formatMobileMessagePreviewBody(
  body: string,
  attachmentCount = 0,
): string {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (attachmentCount <= 0) return "";
  return attachmentCount === 1 ? "Photo" : "Photos";
}
