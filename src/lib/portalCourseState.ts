import { fetchOwnMemberProfile, updateOwnBucketListCourseIds } from "./memberProfiles";

let bucketListCourseIds: string[] = [];
let bucketListHydrated = false;
let bucketListHydrationPromise: Promise<void> | null = null;

export type BucketListToggleResult = {
  isOnBucketList: boolean;
  error: Error | null;
};

export function hydrateBucketListCourseIds(courseIds: string[]) {
  bucketListCourseIds = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  bucketListHydrated = true;
}

export function isBucketListHydrated() {
  return bucketListHydrated;
}

export function getBucketListCourseIds(): string[] {
  return [...bucketListCourseIds];
}

export function isCourseOnBucketList(courseId: string): boolean {
  return bucketListCourseIds.includes(courseId.trim());
}

export async function ensureBucketListHydrated() {
  if (bucketListHydrated) return;

  if (!bucketListHydrationPromise) {
    bucketListHydrationPromise = (async () => {
      const { data } = await fetchOwnMemberProfile();
      if (data) {
        hydrateBucketListCourseIds(data.bucket_list_course_ids);
      }
    })().finally(() => {
      bucketListHydrationPromise = null;
    });
  }

  await bucketListHydrationPromise;
}

export async function toggleBucketListCourse(courseId: string): Promise<BucketListToggleResult> {
  const normalizedCourseId = courseId.trim();
  if (!normalizedCourseId) {
    return { isOnBucketList: false, error: new Error("Course id is required.") };
  }

  await ensureBucketListHydrated();

  const current = getBucketListCourseIds();
  const wasOnBucketList = current.includes(normalizedCourseId);
  const next = wasOnBucketList
    ? current.filter((id) => id !== normalizedCourseId)
    : [...current, normalizedCourseId];

  const { data, error } = await updateOwnBucketListCourseIds(next);

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[portalCourseState] bucket list update failed", error);
    }
    return { isOnBucketList: wasOnBucketList, error };
  }

  bucketListCourseIds = data ?? next;
  bucketListHydrated = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("elitetee:course-state-changed"));
  }
  return {
    isOnBucketList: bucketListCourseIds.includes(normalizedCourseId),
    error: null,
  };
}

export function resetBucketListStateForTests() {
  bucketListCourseIds = [];
  bucketListHydrated = false;
  bucketListHydrationPromise = null;
}

const PLAYED_KEY = "elitetee_played_courses";

function readPlayedList(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PLAYED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writePlayedList(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYED_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("elitetee:course-state-changed"));
}

export function getPlayedCourseIds(): string[] {
  return readPlayedList();
}

export function isCoursePlayed(courseId: string): boolean {
  return getPlayedCourseIds().includes(courseId);
}

export function togglePlayedCourse(courseId: string): boolean {
  const current = getPlayedCourseIds();
  const next = current.includes(courseId)
    ? current.filter((id) => id !== courseId)
    : [...current, courseId];
  writePlayedList(next);
  return next.includes(courseId);
}

export function findCourseIdByName(courseName: string): string | null {
  return courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
