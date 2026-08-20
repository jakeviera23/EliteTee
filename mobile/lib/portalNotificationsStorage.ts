import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN_INTRO_REQUESTS_KEY = (userId: string) => `elitetee-seen-intro-requests:${userId}`;
const NETWORK_ACTIVITY_SEEN_KEY = (userId: string) => `elitetee-network-activity-seen:${userId}`;

export async function getSeenIntroductionRequestIds(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(SEEN_INTRO_REQUESTS_KEY(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map(String));
  } catch {
    return new Set<string>();
  }
}

export async function markIntroductionRequestsSeen(userId: string, requestIds: string[]) {
  if (requestIds.length === 0) return;
  const seen = await getSeenIntroductionRequestIds(userId);
  requestIds.forEach((requestId) => seen.add(requestId));
  await AsyncStorage.setItem(SEEN_INTRO_REQUESTS_KEY(userId), JSON.stringify([...seen]));
}

export async function getLastSeenNetworkActivityAt(userId: string) {
  try {
    const value = await AsyncStorage.getItem(NETWORK_ACTIVITY_SEEN_KEY(userId));
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

export async function markNetworkActivitySeen(userId: string, seenAt = new Date().toISOString()) {
  if (!userId.trim() || !Number.isFinite(Date.parse(seenAt))) return;
  await AsyncStorage.setItem(NETWORK_ACTIVITY_SEEN_KEY(userId), seenAt);
}
