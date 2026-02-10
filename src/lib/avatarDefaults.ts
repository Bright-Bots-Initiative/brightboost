// src/lib/avatarDefaults.ts
// Shared helper for default avatar URL and normalization

export const DEFAULT_AVATAR_PATH = "/robots/robot_default.png";

// Cache-bust version from env or fallback
const assetV = (import.meta as any).env?.VITE_ASSET_VERSION ?? "1";

export const DEFAULT_AVATAR_URL = `${DEFAULT_AVATAR_PATH}?v=${assetV}`;

/**
 * Normalizes an avatar URL to ensure:
 * - Empty/null/undefined → default robot avatar
 * - Default path without version → cache-busted version
 * - Data URLs and other valid URLs → passed through
 */
export function normalizeAvatarUrl(url?: string | null): string {
  if (!url || url.trim() === "") {
    return DEFAULT_AVATAR_URL;
  }

  // Add cache-bust to default path if missing
  if (url === DEFAULT_AVATAR_PATH) {
    return DEFAULT_AVATAR_URL;
  }

  return url;
}

/**
 * Checks if a URL is likely broken (stub/placeholder URLs)
 */
export function isLikelyBrokenUrl(url?: string | null): boolean {
  if (!url) return false;

  // Known stub/broken URL patterns
  const brokenPatterns = [
    "stub-bucket.s3.amazonaws.com",
    "placeholder",
    "example.com",
  ];

  return brokenPatterns.some((pattern) => url.includes(pattern));
}
