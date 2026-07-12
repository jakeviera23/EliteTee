function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

/** Member-safe copy in production; includes raw Supabase details in development. */
export function formatDiscoverMemberLoadError(error: unknown): string {
  if (import.meta.env.DEV) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return code ? `[Dev ${code}] ${message}` : `[Dev] ${message}`;
  }

  return "Member profiles could not be loaded right now.";
}

export function logDiscoverMemberLoadError(error: unknown, context: Record<string, unknown> = {}) {
  const payload = {
    context: "fetchDiscoverablePortalMembers",
    code: getErrorCode(error),
    message: getErrorMessage(error),
    ...context,
  };

  if (import.meta.env.DEV) {
    console.error("[PortalDiscover]", payload);
  } else {
    console.error("[PortalDiscover] member directory load failed", payload.message);
  }
}
