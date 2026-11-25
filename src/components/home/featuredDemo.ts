export const QUBIT_COVE_DEMO_GAME = "qubit_cove";
export const QUBIT_COVE_DEMO_ID = "qubit_cove_demo";
export const QUBIT_COVE_DEMO_PATH = `/try?game=${QUBIT_COVE_DEMO_GAME}`;

export function homeDemoHref(band: "k2" | "g3_5") {
  return band === "k2" ? QUBIT_COVE_DEMO_PATH : "/try?band=g3_5";
}

const playKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "KeyA",
  "KeyD",
  "KeyE",
  "KeyS",
  "KeyW",
  "Space",
]);

export function isDemoPlayKey(
  event: Pick<KeyboardEvent, "code" | "altKey" | "ctrlKey" | "metaKey">,
) {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    playKeys.has(event.code)
  );
}

type ControlClick = Pick<
  MouseEvent,
  "target" | "button" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

function isPrimaryActivation(event: ControlClick) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export function isCoveControlClick(event: ControlClick) {
  return (
    isPrimaryActivation(event) &&
    event.target instanceof Element &&
    Boolean(event.target.closest("button:enabled, input:enabled"))
  );
}

export function isCoveControlPress(
  event: ControlClick & Pick<PointerEvent, "isPrimary">,
) {
  // Movement begins on contact; other controls activate on the completed click.
  return (
    isPrimaryActivation(event) &&
    event.isPrimary !== false &&
    event.target instanceof Element &&
    Boolean(event.target.closest("button.qc-control:enabled"))
  );
}
