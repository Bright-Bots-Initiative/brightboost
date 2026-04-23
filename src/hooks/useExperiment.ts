/**
 * A/B testing client hook.
 * Usage:
 *   const { variant, loading, trackEvent } = useExperiment("my-experiment-slug");
 *   if (variant === "variant") showNewFlow();
 *   trackEvent("game_completed", score);
 *
 * Fails safe: on any error (network, missing experiment, unauthenticated),
 * returns "control" so existing behavior is preserved.
 */
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/services/api";

export type ExperimentVariant = "control" | "variant";

export function useExperiment(slug: string) {
  const api = useApi();
  const [variant, setVariant] = useState<ExperimentVariant>("control");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/experiments/${slug}/variant`)
      .then((data: { variant?: ExperimentVariant }) => {
        if (cancelled) return;
        setVariant(data?.variant === "variant" ? "variant" : "control");
      })
      .catch(() => {
        if (!cancelled) setVariant("control");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug]);

  const trackEvent = useCallback(
    (eventName: string, eventValue?: number, metadata?: unknown) => {
      api
        .post(`/experiments/${slug}/event`, {
          eventName,
          eventValue,
          metadata,
        })
        .catch(() => {
          // Tracking is fire-and-forget; never break the UX on a failed event.
        });
    },
    [api, slug],
  );

  return { variant, loading, trackEvent };
}
