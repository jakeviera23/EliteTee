/** Stored on cancel so UI can distinguish withdraw vs receiver decline without a new status. */
export const INTRODUCTION_WITHDRAWN_RESPONSE = "Withdrawn by requester.";

export function isIntroductionWithdrawn(
  request: Pick<{ response_message?: string | null; status: string }, "response_message" | "status">,
): boolean {
  if (request.status.toLowerCase() !== "declined") return false;
  return (request.response_message ?? "").trim() === INTRODUCTION_WITHDRAWN_RESPONSE;
}
