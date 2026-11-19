import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, nearbyBeacon, stepGame, type GameState } from "./engine";
import { createCoveRenderer } from "./scene";
import type { BeaconId } from "./world";

export type Control = "left" | "right" | "up" | "down" | "jump";

const keyControls: Partial<Record<string, Control>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
};

function status(state: GameState) {
  return {
    near: nearbyBeacon(state),
    lit: state.lit,
    sparks: state.collected.length,
  };
}

export function useCovePlay(
  paused: boolean,
  reduced: boolean,
  onUse: (beacon: BeaconId) => void,
  embedded: boolean,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLElement>(null);
  const [world] = useState(() => ({ current: createGame() }));
  const [hud, setHud] = useState(() => status(world.current));
  const previous = useRef(hud);
  const inputs = useRef(new Map<string, Control>());
  const pulses = useRef(new Set<Control>());
  const options = useRef({ paused, reduced, onUse });

  const resetInputs = useCallback(() => {
    inputs.current.clear();
    pulses.current.clear();
  }, []);

  useEffect(() => {
    options.current = { paused, reduced, onUse };
    if (paused) resetInputs();
  }, [paused, reduced, onUse, resetInputs]);

  const update = useCallback(
    (next: GameState) => {
      world.current = next;
      const current = status(next);
      const old = previous.current;
      if (
        old.near !== current.near ||
        old.lit !== current.lit ||
        old.sparks !== current.sparks
      ) {
        previous.current = current;
        setHud(current);
      }
    },
    [world],
  );

  useEffect(() => {
    const playArea = region.current;
    if (!canvas.current || !playArea) return;
    const scene = createCoveRenderer(canvas.current);
    const held = inputs.current;
    const tapped = pulses.current;
    let last = performance.now();
    let elapsed = 0;
    let animation = 0;
    let lastPaint = -Infinity;
    let inView = true;

    function frame(now: number) {
      const dt = Math.min(Math.max(0, (now - last) / 1000), 0.08);
      last = now;
      if (!options.current.paused) {
        const active = new Set([...held.values(), ...tapped]);
        update(
          stepGame(
            world.current,
            {
              x: Number(active.has("right")) - Number(active.has("left")),
              z: Number(active.has("down")) - Number(active.has("up")),
              jump: active.has("jump"),
            },
            dt,
          ),
        );
        tapped.clear();
        elapsed += dt;
      }
      // The map and beacon panels pause the world. Repaint occasionally for resizing.
      if (!options.current.paused || now - lastPaint >= 250) {
        scene.draw(world.current, elapsed, options.current.reduced);
        lastPaint = now;
      }
      animation = requestAnimationFrame(frame);
    }

    function keyDown(event: KeyboardEvent) {
      if (
        !inView ||
        options.current.paused ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        !region.current?.contains(target) &&
        (embedded || target !== document.body)
      )
        return;
      if (
        target.isContentEditable ||
        target.closest("input, select, textarea, [role=textbox]")
      )
        return;
      if (event.code === "KeyE") {
        const beacon = nearbyBeacon(world.current);
        if (!event.repeat && beacon) {
          event.preventDefault();
          options.current.onUse(beacon);
        }
        return;
      }
      const control = keyControls[event.code];
      if (
        !control ||
        (control === "jump" && target.closest("button,a,summary"))
      )
        return;
      event.preventDefault();
      held.set(event.code, control);
      if (!event.repeat) tapped.add(control);
    }

    const keyUp = (event: KeyboardEvent) => {
      held.delete(event.code);
    };
    const visibility = () => {
      resetInputs();
      last = performance.now();
    };
    const leave = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !playArea.contains(event.relatedTarget)
      )
        resetInputs();
    };
    // Stop the embedded simulation while the visitor reads the rest of the page.
    const observer =
      embedded && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            if (!entry || inView === entry.isIntersecting) return;
            inView = entry.isIntersecting;
            visibility();
            if (inView) animation = requestAnimationFrame(frame);
            else cancelAnimationFrame(animation);
          })
        : null;
    observer?.observe(playArea);
    if (embedded) playArea.addEventListener("focusout", leave);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", resetInputs);
    document.addEventListener("visibilitychange", visibility);
    animation = requestAnimationFrame(frame);
    return () => {
      observer?.disconnect();
      if (embedded) playArea.removeEventListener("focusout", leave);
      cancelAnimationFrame(animation);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", resetInputs);
      document.removeEventListener("visibilitychange", visibility);
      resetInputs();
    };
  }, [embedded, resetInputs, update, world]);

  function press(id: number, control: Control) {
    inputs.current.set(String(id), control);
    pulses.current.add(control);
  }
  function release(id: number) {
    inputs.current.delete(String(id));
  }
  return {
    canvas,
    region,
    world,
    hud,
    update,
    press,
    release,
    pulse: (c: Control) => pulses.current.add(c),
  };
}
