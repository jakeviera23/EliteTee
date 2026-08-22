import { formatNotificationTimestamp } from "./portalNotificationCenter";

/**
 * Subtle receipt label for messages sent by the signed-in member.
 * Uses existing private_messages.read_at — no separate read-state system.
 */
export function formatOwnMessageReadReceipt(readAt: string | null | undefined): string {
  if (!readAt) return "Sent";

  const short = formatNotificationTimestamp(readAt);
  return short ? `Read ${short}` : "Read";
}
