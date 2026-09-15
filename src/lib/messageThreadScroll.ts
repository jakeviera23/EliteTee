/** Near-bottom threshold for thread auto-scroll (px). */
export const MESSAGE_THREAD_NEAR_BOTTOM_PX = 100;

export function isMessageThreadNearBottom(
  el: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">,
  thresholdPx = MESSAGE_THREAD_NEAR_BOTTOM_PX,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

/** Scroll only the thread history container — never the document. */
export function scrollMessageThreadToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}
