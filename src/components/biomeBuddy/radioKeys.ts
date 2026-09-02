/**
 * Keyboard helpers for the chip radiogroups (biome, trait options, name kit).
 *
 * Roving tabindex: only the checked chip is in the Tab order, so Tab moves
 * one stop per group instead of walking every chip. Arrow keys (and
 * Home/End) move focus within the group; Space/Enter on the focused chip
 * selects it. Arrow keys deliberately do NOT auto-select, because selecting
 * a trait opens its science card — a modal per keypress would be hostile.
 */
import type { KeyboardEvent } from "react";

export function radioTabIndex(selected: boolean): 0 | -1 {
  return selected ? 0 : -1;
}

const SELECTOR = '[role="radio"]:not([aria-disabled="true"])';

export function onRadioArrowKeys(event: KeyboardEvent<HTMLElement>): void {
  const keys = [
    "ArrowRight",
    "ArrowDown",
    "ArrowLeft",
    "ArrowUp",
    "Home",
    "End",
  ];
  if (!keys.includes(event.key)) return;
  const chips = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(SELECTOR),
  );
  if (chips.length === 0) return;
  const index = chips.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  event.preventDefault();
  let next = index;
  if (event.key === "Home") next = 0;
  else if (event.key === "End") next = chips.length - 1;
  else {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    next = (index + (forward ? 1 : -1) + chips.length) % chips.length;
  }
  chips[next].focus();
}
