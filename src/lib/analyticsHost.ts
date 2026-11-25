export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
export const INVALID_ANALYTICS_HOST_WARNING =
  "[analytics] Invalid VITE_POSTHOG_HOST; using the default ingestion host.";

/** Check the original shape too: URL parsing normalizes empty delimiters and dot paths. */
export function analyticsIngestionOrigin(raw?: string): string | undefined {
  if (!raw || !/^https:\/\/[^/?#\\\s]+\/?$/i.test(raw)) return;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.origin;
  } catch {
    // A URL parser error can include the rejected input.
  }
}
