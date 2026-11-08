import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  LevelSpec,
  MachineSpec,
  RunResult,
} from "@shared/greatwork-engine";
import { EnginePlayback } from "./playback";
import type { PlaybackState, PlaybackSnapshot } from "./playback";
export function useEnginePlayback(
  level: LevelSpec,
  program: MachineSpec,
  onResult: (result: RunResult) => void,
  onState?: (state: PlaybackState) => void,
) {
  const callbacks = useRef({ onResult, onState });
  callbacks.current = { onResult, onState };
  const binding = JSON.stringify([level, program]);
  const currentBinding = useRef(binding);
  currentBinding.current = binding;
  const controller = useMemo(() => {
    const [boundLevel, boundProgram] = JSON.parse(binding) as [
      LevelSpec,
      MachineSpec,
    ];
    return new EnginePlayback(boundLevel, boundProgram, undefined, (result) => {
      if (currentBinding.current === binding)
        callbacks.current.onResult(result);
    });
  }, [binding]); // The controlled JSON, not mutable reference identity, defines a run.
  const [, redraw] = useState(0);
  useLayoutEffect(() => {
    const publish = () => {
      redraw((n) => n + 1);
      callbacks.current.onState?.(controller.get().mode);
    };
    const unsub = controller.subscribe(publish);
    publish();
    return () => {
      unsub();
      controller.pause();
    };
  }, [controller]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) controller.pause();
    };
    const blur = () => controller.pause();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", blur);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", blur);
      controller.pause();
    };
  }, [controller]);
  // Never dispose a memoized controller in a StrictMode effect replay. Pausing
  // invalidates/cancels every pending callback; a disconnected controller has no listeners.
  const snapshot: PlaybackSnapshot = controller.get();
  return { controller, snapshot };
}
