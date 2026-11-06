import type { Atom, AtomId, Bond, Molecule } from "./types";
import { compareAxial, equal, key, reflect, rotate } from "./board";
import { ELEMENTS } from "./reactions";
function assertMolecule(m: Molecule): void {
  if (
    !m ||
    !Array.isArray(m.atoms) ||
    m.atoms.length < 1 ||
    m.atoms.length > 8192 ||
    !Array.isArray(m.bonds) ||
    m.bonds.length > m.atoms.length * 3
  )
    throw new Error("GW_MOLECULE_SHAPE");
  if (Object.keys(m).some((k) => k !== "atoms" && k !== "bonds"))
    throw new Error("GW_MOLECULE_EXTRA_FIELD");
  const cells = new Set<string>(),
    edges = new Set<string>();
  for (const a of m.atoms) {
    if (
      !a ||
      Object.keys(a).some((k) => k !== "element" && k !== "at") ||
      !a.at ||
      Object.keys(a.at).some((k) => k !== "q" && k !== "r") ||
      !Number.isSafeInteger(a.at.q) ||
      !Number.isSafeInteger(a.at.r) ||
      Math.abs(a.at.q) > 4096 ||
      Math.abs(a.at.r) > 4096 ||
      typeof a.element !== "string" ||
      !Object.prototype.hasOwnProperty.call(ELEMENTS, a.element)
    )
      throw new Error("GW_MOLECULE_ATOM");
    if (cells.has(key(a.at))) throw new Error("GW_MOLECULE_OVERLAP");
    cells.add(key(a.at));
  }
  for (const b of m.bonds) {
    if (
      !b ||
      Object.keys(b).some((k) => k !== "a" && k !== "b" && k !== "order") ||
      !Number.isInteger(b.a) ||
      !Number.isInteger(b.b) ||
      b.a < 0 ||
      b.b < 0 ||
      b.a >= m.atoms.length ||
      b.b >= m.atoms.length ||
      b.a === b.b ||
      (b.order !== 1 && b.order !== 3)
    )
      throw new Error("GW_MOLECULE_BOND");
    const k = `${Math.min(b.a, b.b)},${Math.max(b.a, b.b)}`;
    if (edges.has(k)) throw new Error("GW_MOLECULE_DUPLICATE_BOND");
    edges.add(k);
  }
}
function normalized(m: Molecule, steps: number): Molecule {
  const positioned = m.atoms.map((a, index) => ({
    ...a,
    at: rotate(a.at, steps),
    index,
  }));
  positioned.sort(
    (a, b) =>
      compareAxial(a.at, b.at) ||
      (a.element < b.element ? -1 : a.element > b.element ? 1 : 0),
  );
  const origin = positioned[0].at;
  const order = new Map(positioned.map((a, i) => [a.index, i]));
  const bonds = m.bonds
    .map((b) => {
      const a = order.get(b.a)!,
        c = order.get(b.b)!;
      return { a: Math.min(a, c), b: Math.max(a, c), order: b.order };
    })
    .sort((a, b) => a.a - b.a || a.b - b.b || a.order - b.order);
  return {
    atoms: positioned.map((a) => ({
      element: a.element,
      at: { q: a.at.q - origin.q, r: a.at.r - origin.r },
    })),
    bonds,
  };
}
/** There are SIX candidates. Including reflections here would silently erase chirality. */
export function canonicalRotations(m: Molecule): readonly string[] {
  assertMolecule(m);
  return [0, 1, 2, 3, 4, 5].map((n) => JSON.stringify(normalized(m, n)));
}
export function canonicalize(m: Molecule): string {
  return [...canonicalRotations(m)].sort()[0];
}
export function canonicalMolecule(m: Molecule): Molecule {
  return JSON.parse(canonicalize(m)) as Molecule;
}
export function matches(product: Molecule, target: Molecule): boolean {
  return canonicalize(product) === canonicalize(target);
}
export function reflectMolecule(m: Molecule): Molecule {
  assertMolecule(m);
  return {
    atoms: m.atoms.map((a) => ({ element: a.element, at: reflect(a.at) })),
    bonds: m.bonds.map((b) => ({ ...b })),
  };
}
export function isMirrorOf(product: Molecule, target: Molecule): boolean {
  return (
    canonicalize(product) !== canonicalize(target) &&
    canonicalize(reflectMolecule(product)) === canonicalize(target)
  );
}
export function connectedIds(
  root: AtomId,
  atoms: ReadonlyMap<AtomId, Atom>,
  bonds: readonly Bond[],
): AtomId[] {
  if (!atoms.has(root)) return [];
  const visited = new Set<AtomId>([root]),
    queue = [root];
  const neighbours = new Map<AtomId, AtomId[]>();
  for (const b of bonds) {
    neighbours.set(b.a, [...(neighbours.get(b.a) ?? []), b.b]);
    neighbours.set(b.b, [...(neighbours.get(b.b) ?? []), b.a]);
  }
  for (let i = 0; i < queue.length; i++)
    for (const next of neighbours.get(queue[i]) ?? []) {
      if (atoms.has(next) && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  return [...visited].sort((a, b) => a - b);
}
export function moleculeFrom(
  ids: readonly AtomId[],
  atoms: ReadonlyMap<AtomId, Atom>,
  bonds: readonly Bond[],
): Molecule {
  const sorted = [...ids].sort((a, b) => a - b),
    indexes = new Map(sorted.map((id, i) => [id, i]));
  return canonicalMolecule({
    atoms: sorted.map((id) => ({
      element: atoms.get(id)!.element,
      at: { ...atoms.get(id)!.at },
    })),
    bonds: bonds
      .filter((b) => indexes.has(b.a) && indexes.has(b.b))
      .map((b) => ({
        a: indexes.get(b.a)!,
        b: indexes.get(b.b)!,
        order: b.order,
      })),
  });
}
export const hasCell = (m: Molecule, q: number, r: number): boolean =>
  m.atoms.some((a) => equal(a.at, { q, r }));
