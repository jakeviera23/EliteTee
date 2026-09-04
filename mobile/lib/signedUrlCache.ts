import { getSessionCache, setSessionCache } from "./sessionCache";

const SIGNED_URL_CACHE_TTL_MS = 50 * 60 * 1000;

function cacheKey(bucket: string, path: string) {
  return `signed:${bucket}:${path}`;
}

export function getCachedSignedUrl(bucket: string, path: string) {
  return getSessionCache<string>(cacheKey(bucket, path));
}

export function setCachedSignedUrl(bucket: string, path: string, url: string) {
  setSessionCache(cacheKey(bucket, path), url, SIGNED_URL_CACHE_TTL_MS);
}
