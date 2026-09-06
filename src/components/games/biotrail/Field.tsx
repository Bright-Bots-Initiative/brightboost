import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { drawField } from "./draw";
import {
  EMPTY_CONTROLS,
  spawnPlayer,
  stepPlayer,
  type Controls,
  type Level,
  type Tool,
} from "./model";
export function Field({
  level,
  tool,
  reduced,
  onFinish,
  onEdit,
}: {
  level: Level;
  tool: Tool;
  reduced: boolean;
  onFinish: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const player = useRef(spawnPlayer(level));
  const controls = useRef<Controls>({ ...EMPTY_CONTROLS });
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("start");
  useEffect(() => {
    region.current?.focus();
  }, []);
  useEffect(() => {
    const stop = () => {
      controls.current = { ...EMPTY_CONTROLS };
      setPaused(true);
    };
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      last = 0,
      accumulator = 0;
    const tick = (now: number) => {
      if (!paused) {
        accumulator += last ? Math.min((now - last) / 1000, 0.08) : 0;
        while (accumulator >= 1 / 60) {
          const old = player.current;
          player.current = stepPlayer(
            old,
            controls.current,
            level,
            tool,
            1 / 60,
          );
          if (player.current.returns > old.returns)
            setNotice("checkpointReturn");
          else if (player.current.checkpoint && !old.checkpoint)
            setNotice("checkpoint");
          accumulator -= 1 / 60;
          if (player.current.finished) {
            finish.current();
            return;
          }
        }
      }
      last = now;
      drawField(ctx, level, player.current, tool, reduced);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [level, tool, paused, reduced]);
  const keyControl = (key: string): keyof Controls | null =>
    (
      ({
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
        ArrowUp: "jump",
        w: "jump",
        W: "jump",
        " ": "jump",
      }) as const
    )[key as "ArrowLeft"] ?? null;
  function restart() {
    const checkpoint = player.current.checkpoint;
    player.current = spawnPlayer(level, checkpoint);
    controls.current = { ...EMPTY_CONTROLS };
    setNotice("checkpointReturn");
    region.current?.focus();
  }
  const hold = (
    control: keyof Controls,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      className="biotrail-control"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        controls.current[control] = true;
      }}
      onPointerUp={() => {
        controls.current[control] = false;
      }}
      onPointerCancel={() => {
        controls.current[control] = false;
      }}
      onLostPointerCapture={() => {
        controls.current[control] = false;
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          controls.current[control] = true;
        }
      }}
      onKeyUp={() => {
        controls.current[control] = false;
      }}
      onBlur={() => {
        controls.current[control] = false;
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="biotrail-field">
      <div className="biotrail-field-toolbar">
        <strong>{t(`biotrail.islands.${level.id}.name`)}</strong>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            {t("biotrail.edit")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              controls.current = { ...EMPTY_CONTROLS };
              setPaused(!paused);
              region.current?.focus();
            }}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}{" "}
            {t(paused ? "biotrail.resume" : "biotrail.pause")}
          </Button>
          <Button
            variant="outline"
            aria-label={t("biotrail.restart")}
            onClick={restart}
          >
            <RotateCcw size={17} />
          </Button>
        </div>
      </div>
      <p id="biotrail-controls" className="biotrail-control-help">
        {t("biotrail.controls")}
      </p>
      <div
        className="biotrail-stage"
        ref={region}
        tabIndex={0}
        role="group"
        aria-label={t("biotrail.fieldLabel")}
        aria-describedby="biotrail-controls"
        onBlur={() => {
          controls.current = { ...EMPTY_CONTROLS };
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setPaused(true);
            controls.current = { ...EMPTY_CONTROLS };
            return;
          }
          const c = keyControl(e.key);
          if (c) {
            e.preventDefault();
            controls.current[c] = true;
          }
        }}
        onKeyUp={(e) => {
          const c = keyControl(e.key);
          if (c) {
            e.preventDefault();
            controls.current[c] = false;
          }
        }}
      >
        <canvas ref={canvas} width={800} height={400} aria-hidden="true" />
        {paused && (
          <div className="biotrail-paused">
            <strong>{t("biotrail.paused")}</strong>
            <Button
              onClick={() => {
                setPaused(false);
                region.current?.focus();
              }}
            >
              {t("biotrail.resume")}
            </Button>
          </div>
        )}
      </div>
      <div className="biotrail-controls">
        <div>
          {hold("left", t("biotrail.left"), <ArrowLeft size={24} />)}
          {hold("right", t("biotrail.right"), <ArrowRight size={24} />)}
        </div>
        {hold(
          "jump",
          t(tool === "glide" ? "biotrail.jumpGlide" : "biotrail.jump"),
          <ArrowUp size={24} />,
        )}
      </div>
      <p className="biotrail-field-notice" role="status">
        {t(`biotrail.notices.${notice}`)}
      </p>
    </div>
  );
}
