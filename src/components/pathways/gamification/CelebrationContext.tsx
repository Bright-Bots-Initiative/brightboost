/**
 * CelebrationContext — global pop-up surface for level-up and badge-earned events.
 *
 * Any consumer that receives a gamification side-effect payload from the API
 * (`{ leveledUp: true, ... }` or `{ badges: [...] }`) can call `celebrate({...})`
 * to surface a brief modal. Queue is FIFO so back-to-back awards don't overlap.
 *
 * Respects `prefers-reduced-motion` — drops the pop animation when set.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface LevelUpCelebration {
  type: "level";
  newLevel: number;
  tier: string;
}

export interface BadgeCelebration {
  type: "badge";
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export type CelebrationEvent = LevelUpCelebration | BadgeCelebration;

interface CelebrationContextValue {
  celebrate: (event: CelebrationEvent | CelebrationEvent[]) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useCelebrate(): CelebrationContextValue {
  // Safe no-op when used outside the provider so any component can call it
  // without coupling to the layout shell.
  const ctx = useContext(CelebrationContext);
  return ctx ?? { celebrate: () => {} };
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const celebrate = useCallback((event: CelebrationEvent | CelebrationEvent[]) => {
    setQueue((q) => [...q, ...(Array.isArray(event) ? event : [event])]);
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  const current = queue[0];

  const value = useMemo<CelebrationContextValue>(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {current && (
        <CelebrationOverlay
          event={current}
          onDismiss={dismiss}
          reducedMotion={reducedMotion}
        />
      )}
    </CelebrationContext.Provider>
  );
}

function CelebrationOverlay({
  event,
  onDismiss,
  reducedMotion,
}: {
  event: CelebrationEvent;
  onDismiss: () => void;
  reducedMotion: boolean;
}) {
  // Auto-dismiss after 4s so the queue keeps moving even if the student
  // taps away from the device.
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const animateClass = reducedMotion ? "" : "animate-pop";

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-w-sm w-full rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 sm:p-8 text-center shadow-2xl ${animateClass}`}
      >
        {event.type === "level" ? (
          <>
            <div className="text-5xl mb-3" aria-hidden>
              🎉
            </div>
            <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">
              Level Up!
            </p>
            <p className="text-3xl font-bold text-white mt-2">Level {event.newLevel}</p>
            <p className="text-white/90 text-base mt-1">{event.tier}</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3" aria-hidden>
              {event.icon || "🏆"}
            </div>
            <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">
              Badge Earned
            </p>
            <p className="text-2xl font-bold text-white mt-2">{event.name}</p>
            <p className="text-white/80 text-sm mt-2">{event.description}</p>
          </>
        )}
        <button
          onClick={onDismiss}
          className="mt-5 sm:mt-6 px-6 py-2 min-h-[44px] rounded-lg bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white text-sm font-semibold transition-all"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
