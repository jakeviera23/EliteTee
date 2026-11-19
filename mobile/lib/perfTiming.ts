const marks = new Map<string, number>();

export type PerfScreen =
  | "home"
  | "discover-members"
  | "discover-courses"
  | "profile-identity"
  | "profile-secondary"
  | "messages";

function formatMeta(meta?: Record<string, unknown>) {
  if (!meta || Object.keys(meta).length === 0) return "";
  return ` ${JSON.stringify(meta)}`;
}

export function perfStart(screen: PerfScreen) {
  if (!__DEV__) return;
  marks.set(screen, Date.now());
}

export function perfEnd(screen: PerfScreen, meta?: Record<string, unknown>) {
  if (!__DEV__) return;
  const startedAt = marks.get(screen);
  if (startedAt === undefined) return;
  marks.delete(screen);
  const durationMs = Date.now() - startedAt;
  console.log(`[mobile-perf] ${screen} ${durationMs}ms${formatMeta(meta)}`);
}

export async function perfMeasure<T>(
  screen: PerfScreen,
  task: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  perfStart(screen);
  try {
    return await task();
  } finally {
    perfEnd(screen, meta);
  }
}
