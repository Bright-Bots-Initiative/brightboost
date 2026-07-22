// Read-time projection for Creation.content.
//
// Creation content is validated before it is written, but projecting it again
// at the API boundary keeps a malformed or manually inserted JSON value from
// exposing fields a creation type does not own. Keep each shape aligned with
// that type's write validator.

const LEAF = Symbol("creation-content-leaf");
const OMIT = Symbol("creation-content-omit");

type Projection =
  | typeof LEAF
  | { readonly [key: string]: Projection }
  | readonly [Projection];

const CONTENT_PROJECTIONS = {
  data_dash_challenge: {
    v: LEAF,
    cardIds: [LEAF],
    sortRule: LEAF,
    inferRule: LEAF,
  },
  race_track: {
    v: LEAF,
    name: LEAF,
    grid: {
      w: LEAF,
      h: LEAF,
    },
    pieces: [
      {
        x: LEAF,
        y: LEAF,
        type: LEAF,
        rot: LEAF,
      },
    ],
  },
  sound_duet: {
    v: LEAF,
    name: LEAF,
    band: LEAF,
    pulses: LEAF,
    layers: {
      lead: [
        {
          t: LEAF,
          soundId: LEAF,
        },
      ],
      partner: [
        {
          t: LEAF,
          soundId: LEAF,
        },
      ],
    },
    spots: [LEAF],
    coverPose: LEAF,
  },
} as const satisfies Record<string, Projection>;

export type SerializedCreationContent = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonPrimitive(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function projectValue(
  value: unknown,
  projection: Projection,
): unknown | typeof OMIT {
  if (projection === LEAF) {
    return isJsonPrimitive(value) ? value : OMIT;
  }

  if (Array.isArray(projection)) {
    if (!Array.isArray(value)) return OMIT;

    const itemProjection = projection[0];
    const projectedItems: unknown[] = [];
    for (const item of value) {
      const projected = projectValue(item, itemProjection);
      if (projected !== OMIT) projectedItems.push(projected);
    }
    return projectedItems;
  }

  if (!isPlainObject(value)) return OMIT;

  const projectedObject: Record<string, unknown> = {};
  for (const [key, childProjection] of Object.entries(projection)) {
    const projected = projectValue(value[key], childProjection);
    if (projected !== OMIT) projectedObject[key] = projected;
  }
  return projectedObject;
}

/**
 * Return only the fields owned by a creation type. Unsupported types and
 * malformed top-level content fail closed instead of returning raw JSON.
 */
export function serializeCreationContent(
  type: string,
  content: unknown,
): SerializedCreationContent | null {
  const projection = CONTENT_PROJECTIONS[
    type as keyof typeof CONTENT_PROJECTIONS
  ] as Projection | undefined;
  if (!projection) return null;

  const projected = projectValue(content, projection);
  return projected !== OMIT && isPlainObject(projected) ? projected : null;
}
