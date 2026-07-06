const BUCKET_KEY = "elitetee_bucket_list";
const PLAYED_KEY = "elitetee_played_courses";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

export function getBucketListCourseIds(): string[] {
  return readList(BUCKET_KEY);
}

export function getPlayedCourseIds(): string[] {
  return readList(PLAYED_KEY);
}

export function isCourseOnBucketList(courseId: string): boolean {
  return getBucketListCourseIds().includes(courseId);
}

export function isCoursePlayed(courseId: string): boolean {
  return getPlayedCourseIds().includes(courseId);
}

export function toggleBucketListCourse(courseId: string): boolean {
  const current = getBucketListCourseIds();
  const next = current.includes(courseId)
    ? current.filter((id) => id !== courseId)
    : [...current, courseId];
  writeList(BUCKET_KEY, next);
  return next.includes(courseId);
}

export function togglePlayedCourse(courseId: string): boolean {
  const current = getPlayedCourseIds();
  const next = current.includes(courseId)
    ? current.filter((id) => id !== courseId)
    : [...current, courseId];
  writeList(PLAYED_KEY, next);
  return next.includes(courseId);
}

export function findCourseIdByName(courseName: string): string | null {
  // Lazy import avoided — callers pass id when available; name fallback for feed posts
  return courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
