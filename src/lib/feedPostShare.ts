export function buildFeedPostDeepLink(postId: string, origin: string): string | null {
  const normalizedId = postId.trim();
  if (!normalizedId) return null;
  try {
    const url = new URL("/member-portal", origin);
    url.searchParams.set("post", normalizedId);
    return url.toString();
  } catch {
    return null;
  }
}

export function buildFeedPostShareText(input: {
  authorName: string;
  courseName?: string;
  caption?: string;
}): string {
  const author = input.authorName.trim() || "A member";
  if (input.courseName?.trim()) {
    return `${author} shared ${input.courseName.trim()} on EliteTee`;
  }
  const caption = input.caption?.trim();
  return caption || `${author} shared an update on EliteTee`;
}
