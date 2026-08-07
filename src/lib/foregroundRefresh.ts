export const MEMBER_FOREGROUND_REFRESH_INTERVAL_MS = 45_000;

export function shouldRefreshMemberExperience(
  lastRefreshAt: number,
  now = Date.now(),
  intervalMs = MEMBER_FOREGROUND_REFRESH_INTERVAL_MS,
): boolean {
  if (!Number.isFinite(lastRefreshAt) || lastRefreshAt <= 0) return true;
  return now - lastRefreshAt >= intervalMs;
}
