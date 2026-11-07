import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import type { Axial } from "@shared/greatwork-engine";
import { drawBoard } from "./drawBoard";
import type { BoardScene } from "./drawBoard";
import { useBoardCamera } from "./useBoardCamera";
import { pixelToAxial, clientPoint, cellInBounds } from "../greatWorkView";
import { cursorNeighbour } from "../greatWorkModel";
export interface BoardHandle {
  hit(x: number, y: number): Axial | null;
  focus(): void;
}
export interface HexBoardProps {
  scene: Omit<BoardScene, "camera" | "labels">;
  disabled: boolean;
  onCursor(at: Axial): void;
  onActivate(at: Axial): void;
}
export const HexBoardCanvas = forwardRef<BoardHandle, HexBoardProps>(
  function HexBoardCanvas({ scene, disabled, onCursor, onActivate }, ref) {
    const { t } = useTranslation();
    const k = (s: string, vars?: object) =>
      t(`games.greatWork.${s}`, { ...vars });
    const element = useRef<HTMLCanvasElement | null>(null),
      wrap = useRef<HTMLDivElement | null>(null);
    const { setNodeRef } = useDroppable({
      id: "gw-board",
      data: { kind: "board" },
      disabled,
    });
    const [width, setWidth] = useState(720);
    const height = width < 450 ? 360 : 430;
    const cameraState = useBoardCamera(scene.bounds, width, height),
      camera = cameraState.camera;
    const [available, setAvailable] = useState(true);
    const tap = useRef<{ id: number; x: number; y: number } | null>(null);
    const refScene = useRef<BoardScene | null>(null);
    refScene.current = {
      ...scene,
      camera,
      labels: {
        input: k("board.inputShort"),
        output: k("board.outputShort"),
        arm: k("parts.arm"),
      },
    };
    useLayoutEffect(() => {
      const measure = () => {
        if (wrap.current)
          setWidth(
            Math.max(
              240,
              Math.round(wrap.current.getBoundingClientRect().width),
            ),
          );
      };
      measure();
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(measure);
      if (wrap.current) observer?.observe(wrap.current);
      window.addEventListener("resize", measure);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measure);
      };
    }, []);
    useLayoutEffect(() => {
      const canvas = element.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setAvailable(false);
        return;
      }
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const id = requestAnimationFrame(() => {
        if (refScene.current) drawBoard(ctx, refScene.current);
      });
      return () => cancelAnimationFrame(id);
    }, [width, height, scene, camera, t]);
    const hit = (x: number, y: number): Axial | null => {
      const rect = element.current?.getBoundingClientRect();
      if (
        !rect ||
        !rect.width ||
        !rect.height ||
        x < rect.left ||
        x > rect.left + rect.width ||
        y < rect.top ||
        y > rect.top + rect.height
      )
        return null;
      const at = pixelToAxial(clientPoint(x, y, rect, camera), camera);
      return cellInBounds(at, scene.bounds) ? at : null;
    };
    useImperativeHandle(ref, () => ({
      hit,
      focus: () => element.current?.focus(),
    }));
    const move = (dir: number) =>
      onCursor(cursorNeighbour(scene.cursor, dir, scene.bounds));
    const directionKeys: Record<string, number> = {
      ArrowRight: 0,
      ArrowDown: 1,
      End: 2,
      ArrowLeft: 3,
      ArrowUp: 4,
      Home: 5,
    };
    return (
      <section className="gw-board-section" aria-labelledby="gw-board-title">
        <div className="gw-board-heading">
          <h2 id="gw-board-title">{k("board.title")}</h2>
          <div
            className="gw-camera"
            role="group"
            aria-label={k("board.camera")}
          >
            <button
              type="button"
              onClick={() => cameraState.setZoom(cameraState.zoom - 0.5)}
              disabled={cameraState.zoom === 1}
              aria-label={k("board.zoomOut")}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => cameraState.setZoom(cameraState.zoom + 0.5)}
              disabled={cameraState.zoom === 3}
              aria-label={k("board.zoomIn")}
            >
              +
            </button>
            <button type="button" onClick={cameraState.fit}>
              {k("board.fit")}
            </button>
          </div>
        </div>
        <div
          className="gw-canvas-wrap"
          ref={(node) => {
            wrap.current = node;
            setNodeRef(node);
          }}
        >
          <canvas
            ref={element}
            className="gw-canvas"
            style={{ width: "100%", height }}
            tabIndex={0}
            role="group"
            aria-roledescription={k("board.role")}
            aria-label={k("board.cursor", scene.cursor)}
            aria-describedby="gw-board-help"
            onPointerMove={(e) => {
              if (e.buttons === 0 && e.pointerType !== "touch") {
                const at = hit(e.clientX, e.clientY);
                if (at) onCursor(at);
              }
            }}
            onPointerDown={(e) => {
              if (e.isPrimary && e.button === 0)
                tap.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            }}
            onPointerCancel={() => {
              tap.current = null;
            }}
            onPointerUp={(e) => {
              const start = tap.current;
              tap.current = null;
              if (
                !start ||
                start.id !== e.pointerId ||
                Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 ||
                !e.isPrimary ||
                e.button !== 0 ||
                disabled
              )
                return;
              const at = hit(e.clientX, e.clientY);
              if (at) {
                onCursor(at);
                onActivate(at);
              }
            }}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return;
              if (e.shiftKey && e.key.startsWith("Arrow")) {
                e.preventDefault();
                cameraState.pan(
                  e.key === "ArrowLeft" ? 45 : e.key === "ArrowRight" ? -45 : 0,
                  e.key === "ArrowUp" ? 45 : e.key === "ArrowDown" ? -45 : 0,
                );
                return;
              }
              if (e.key in directionKeys) {
                e.preventDefault();
                move(directionKeys[e.key]);
              } else if ((e.key === "Enter" || e.key === " ") && !disabled) {
                e.preventDefault();
                if (!e.repeat) onActivate(scene.cursor);
              }
            }}
          >
            {k("board.fallback")}
          </canvas>
          {!available && <p role="status">{k("board.fallback")}</p>}
        </div>
        <div className="gw-board-navigation">
          <span className="gw-coordinate" aria-live="polite">
            {k("board.cursor", scene.cursor)}
          </span>
          <div
            className="gw-cursor-controls"
            role="group"
            aria-label={k("board.moveCursor")}
          >
            {[0, 1, 2, 3, 4, 5].map((dir) => (
              <button
                type="button"
                key={dir}
                aria-label={k(`board.direction${dir}`)}
                onClick={() => move(dir)}
              >
                {["→", "↘", "↙", "←", "↖", "↗"][dir]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onActivate(scene.cursor)}
          >
            {k("board.useHex")}
          </button>
        </div>
        <details id="gw-board-help" className="gw-compact-help">
          <summary>{k("board.helpTitle")}</summary>
          <p>{k("board.help")}</p>
          <div className="gw-camera" role="group" aria-label={k("board.pan")}>
            {[
              [-50, 0],
              [50, 0],
              [0, -50],
              [0, 50],
            ].map(([x, y], i) => (
              <button
                type="button"
                key={i}
                aria-label={k(`board.pan${i}`)}
                onClick={() => cameraState.pan(x, y)}
              >
                {["←", "→", "↑", "↓"][i]}
              </button>
            ))}
          </div>
        </details>
      </section>
    );
  },
);
