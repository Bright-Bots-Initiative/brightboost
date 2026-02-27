// src/lib/avatarDefaults.ts
// Shared helper for default avatar URL and normalization

export const DEFAULT_AVATAR_PATH = "/robots/robot_default.png";

// Cache-bust version from env or fallback
const assetV = (import.meta as any).env?.VITE_ASSET_VERSION ?? "1";

export const DEFAULT_AVATAR_URL = `${DEFAULT_AVATAR_PATH}?v=${assetV}`;

/**
 * Returns true if the role is a teacher (case-insensitive).
 */
export function isTeacherRole(role?: string | null): boolean {
  return !!role && role.toLowerCase() === "teacher";
}

/**
 * Normalizes an avatar URL to ensure:
 * - Empty/null/undefined → default robot avatar (students only)
 * - Teachers with no avatar → returns empty string (callers show initials)
 * - Default path without version → cache-busted version
 * - Data URLs and other valid URLs → passed through
 */
export function normalizeAvatarUrl(
  url?: string | null,
  role?: string | null,
): string {
  if (!url || url.trim() === "") {
    // Teachers should show initials, not the game robot
    if (isTeacherRole(role)) return "";
    return DEFAULT_AVATAR_URL;
  }

  // Teachers shouldn't show the robot default either
  if (isTeacherRole(role) && (url === DEFAULT_AVATAR_PATH || url.startsWith(DEFAULT_AVATAR_PATH))) {
    return "";
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
