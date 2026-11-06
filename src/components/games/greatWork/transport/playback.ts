import { createSimState, step, resultOf } from "@shared/greatwork-engine";
import type {
  LevelSpec,
  MachineSpec,
  RunResult,
  SimState,
} from "@shared/greatwork-engine";
export type PlaybackState =
  | "idle"
  | "running"
  | "paused"
  | "stepping"
  | "errored";
export type PlaybackSpeed = 0.5 | 1 | 2;
export interface PlaybackSnapshot {
  state: SimState | null;
  mode: PlaybackState;
  result: RunResult | null;
  speed: PlaybackSpeed;
  lastPointers: ReadonlyMap<number, number>;
}
export interface PlaybackClock {
  set(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
}
export const defaultClock: PlaybackClock = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};
/** Simulation advances on a timer, never from the canvas animation frame. */
export class EnginePlayback {
  private snapshot: PlaybackSnapshot;
  private timer: unknown = null;
  private epoch = 0;
  private disposed = false;
  private notified = false;
  private listeners = new Set<() => void>();
  constructor(
    readonly level: LevelSpec,
    readonly program: MachineSpec,
    private clock: PlaybackClock = defaultClock,
    private resultCallback: (r: RunResult) => void = () => {},
  ) {
    this.snapshot = {
      state: null,
      mode: "idle",
      result: null,
      speed: 1,
      lastPointers: new Map(),
    };
    this.initialize();
  }
  private initialize(): void {
    try {
      this.snapshot = {
        ...this.snapshot,
        state: createSimState(this.level, this.program),
        mode: "idle",
        result: null,
        lastPointers: new Map(),
      };
    } catch {
      this.snapshot = {
        ...this.snapshot,
        state: null,
        mode: "errored",
        result: null,
        lastPointers: new Map(),
      };
    }
  }
  get = (): PlaybackSnapshot => this.snapshot;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private publish(): void {
    for (const listener of this.listeners) listener();
  }
  private cancel(): void {
    this.epoch++;
    if (this.timer !== null) this.clock.clear(this.timer);
    this.timer = null;
  }
  private schedule(): void {
    if (this.disposed || this.snapshot.mode !== "running") return;
    const epoch = this.epoch;
    this.timer = this.clock.set(() => {
      this.timer = null;
      if (
        this.disposed ||
        epoch !== this.epoch ||
        this.snapshot.mode !== "running"
      )
        return;
      this.advance();
      this.schedule();
    }, 650 / this.snapshot.speed);
  }
  private advance(): void {
    if (!this.snapshot.state || this.snapshot.result || this.disposed) return;
    const previous = this.snapshot.state;
    const state = step(previous);
    const result = resultOf(state);
    const terminal = result.solved || !!state.error;
    this.snapshot = {
      ...this.snapshot,
      state,
      lastPointers: previous.tapePointers,
      mode: terminal
        ? state.error?.kind === "collision"
          ? "errored"
          : "paused"
        : this.snapshot.mode,
      result: terminal ? result : null,
    };
    if (terminal) this.cancel();
    this.publish();
    if (terminal && !this.notified) {
      this.notified = true;
      this.resultCallback(result);
    }
  }
  run(): void {
    if (
      this.disposed ||
      !this.snapshot.state ||
      this.snapshot.result ||
      this.snapshot.mode === "running"
    )
      return;
    this.cancel();
    this.snapshot = { ...this.snapshot, mode: "running" };
    this.publish();
    this.schedule();
  }
  stepOnce(): void {
    if (
      this.disposed ||
      !this.snapshot.state ||
      this.snapshot.result ||
      this.snapshot.mode === "running"
    )
      return;
    this.cancel();
    this.snapshot = { ...this.snapshot, mode: "stepping" };
    this.advance();
  }
  pause(): void {
    if (this.disposed || this.snapshot.mode !== "running") return;
    this.cancel();
    this.snapshot = { ...this.snapshot, mode: "paused" };
    this.publish();
  }
  setSpeed(speed: PlaybackSpeed): void {
    if (
      this.disposed ||
      ![0.5, 1, 2].includes(speed) ||
      this.snapshot.speed === speed
    )
      return;
    this.cancel();
    this.snapshot = { ...this.snapshot, speed };
    this.publish();
    this.schedule();
  }
  reset(): void {
    if (this.disposed) return;
    this.cancel();
    this.notified = false;
    this.initialize();
    this.publish();
  }
  dispose(): void {
    this.cancel();
    this.disposed = true;
    this.listeners.clear();
  }
}
