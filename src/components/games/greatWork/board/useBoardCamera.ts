import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardBounds } from "@shared/greatwork-engine";
import { fitCamera } from "../greatWorkView";

export function useBoardCamera(
  bounds: BoardBounds,
  width: number,
  height: number,
) {
  const [zoom, updateZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const userAdjusted = useRef(false);
  // A full-fit nine-column board makes the starter machine tiny on a phone.
  // Begin closer to its center; Fit always restores the complete board.
  useEffect(() => {
    if (!userAdjusted.current)
      updateZoom(width < 300 ? 2.5 : width < 450 ? 2 : 1);
  }, [width]);
  const camera = useMemo(
    () => fitCamera(bounds, width, height, zoom, offset),
    [bounds, width, height, zoom, offset],
  );
  return {
    camera,
    zoom,
    setZoom: (n: number) => {
      if (!Number.isFinite(n)) return;
      userAdjusted.current = true;
      updateZoom(Math.max(1, Math.min(3, n)));
    },
    pan: (x: number, y: number) => {
      userAdjusted.current = true;
      setOffset((p) => ({
        x: Math.max(-width, Math.min(width, p.x + x)),
        y: Math.max(-height, Math.min(height, p.y + y)),
      }));
    },
    fit: () => {
      userAdjusted.current = true;
      updateZoom(1);
      setOffset({ x: 0, y: 0 });
    },
  };
}
