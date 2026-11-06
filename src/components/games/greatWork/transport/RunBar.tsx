import { useTranslation } from "react-i18next";
import type {
  EnginePlayback,
  PlaybackSnapshot,
  PlaybackSpeed,
} from "./playback";
export interface RunBarProps {
  controller: EnginePlayback;
  snapshot: PlaybackSnapshot;
  blocked: boolean;
  area: boolean;
  onArea(value: boolean): void;
  reduced: boolean;
  onReduced(value: boolean): void;
}
export function RunBar({
  controller,
  snapshot,
  blocked,
  area,
  onArea,
  reduced,
  onReduced,
}: RunBarProps) {
  const { t } = useTranslation();
  const k = (s: string) => t(`games.greatWork.${s}`);
  const running = snapshot.mode === "running";
  return (
    <section className="gw-transport" aria-label={k("transport.title")}>
      <div className="gw-run-controls">
        <button
          type="button"
          className="gw-primary"
          disabled={blocked || !snapshot.state}
          onClick={() => {
            if (running) controller.pause();
            else {
              if (snapshot.result) controller.reset();
              controller.run();
            }
          }}
        >
          <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
          {k(
            running
              ? "transport.pause"
              : snapshot.result
                ? "transport.again"
                : "transport.run",
          )}
        </button>
        <button
          type="button"
          disabled={blocked || running || !snapshot.state || !!snapshot.result}
          onClick={() => controller.stepOnce()}
        >
          <span aria-hidden="true">▸│</span>
          {k("transport.step")}
        </button>
        <button
          type="button"
          onClick={() => controller.reset()}
          disabled={!snapshot.state}
        >
          <span aria-hidden="true">↶</span>
          {k("transport.reset")}
        </button>
        <label className="gw-speed">
          {k("transport.speed")}
          <select
            aria-label={k("transport.speed")}
            value={snapshot.speed}
            onChange={(e) =>
              controller.setSpeed(Number(e.target.value) as PlaybackSpeed)
            }
          >
            {([0.5, 1, 2] as const).map((n) => (
              <option key={n} value={n}>
                {k(
                  `transport.speed${n === 0.5 ? "Half" : n === 1 ? "Normal" : "Double"}`,
                )}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="gw-display-controls">
        <label>
          <input
            type="checkbox"
            checked={area}
            onChange={(e) => onArea(e.target.checked)}
          />
          {k("transport.area")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => onReduced(e.target.checked)}
          />
          {k("transport.calm")}
        </label>
      </div>
      <p className="gw-state" role="status" aria-live="polite">
        {k(`state.${snapshot.result ? "finished" : snapshot.mode}`)}
      </p>
    </section>
  );
}
