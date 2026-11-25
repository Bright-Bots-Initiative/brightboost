import {
  parseStudioDraft,
  verifyStudioDraft,
  type RunResult,
  type StudioDraft,
} from "@shared/greatwork-engine";
import {
  getPersonalBestSession,
  isPersonalBestSessionCurrent,
} from "@/hooks/usePersonalBest";
import { withRequestDeadline } from "@/lib/requestDeadline";
import { API_BASE, ApiError, join } from "@/services/api";

export type StudioScope =
  | { mode: "guest" }
  | { mode: "student"; studentId: string; courseId: string };

type VerifiedRun = Pick<
  RunResult,
  "solved" | "cycles" | "cost" | "area" | "instructions"
> & {
  produced: ReadonlyArray<{
    canonical: string;
    count: number;
    firstTick: number;
  }>;
};

export interface SavedMachine {
  id: string;
  courseId: string | null;
  revision: number;
  updatedAt: string;
  content: StudioDraft;
  lastRun: VerifiedRun;
}

export interface StudioShelf {
  list(): Promise<SavedMachine[]>;
  create(content: StudioDraft): Promise<SavedMachine>;
  revise(previous: SavedMachine, content: StudioDraft): Promise<SavedMachine>;
  duplicate(
    previous: SavedMachine,
    content?: StudioDraft,
  ): Promise<SavedMachine>;
}

const guestPrefix = "bb:great-work:demo:v1:";
const machinesPath = "/great-work/machines";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseRun(value: unknown): VerifiedRun {
  if (
    !record(value) ||
    typeof value.solved !== "boolean" ||
    !count(value.cycles) ||
    !count(value.cost) ||
    !count(value.area) ||
    !count(value.instructions) ||
    !Array.isArray(value.produced)
  )
    throw new Error("invalid_saved_run");
  const produced = value.produced.map((entry: unknown) => {
    if (
      !record(entry) ||
      typeof entry.canonical !== "string" ||
      !count(entry.count) ||
      !count(entry.firstTick)
    )
      throw new Error("invalid_saved_product");
    return {
      canonical: entry.canonical,
      count: entry.count,
      firstTick: entry.firstTick,
    };
  });
  return {
    solved: value.solved,
    cycles: value.cycles,
    cost: value.cost,
    area: value.area,
    instructions: value.instructions,
    produced,
  };
}

function readMachine(
  value: unknown,
  courseId: string | null,
  id?: string,
): SavedMachine {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    (id !== undefined && value.id !== id) ||
    value.courseId !== courseId ||
    !count(value.revision) ||
    !value.revision ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt))
  )
    throw new Error("invalid_saved_machine");
  return {
    id: value.id,
    courseId,
    revision: value.revision,
    updatedAt: value.updatedAt,
    content: parseStudioDraft(value.content),
    lastRun: parseRun(value.lastRun),
  };
}

function readGuest(id: string): SavedMachine | null {
  const data = localStorage.getItem(guestPrefix + id);
  return data === null ? null : readMachine(JSON.parse(data), null, id);
}

function guestShelf(): StudioShelf {
  const write = (
    id: string,
    content: StudioDraft,
    expectedRevision: number | null,
  ) => {
    const save = () => {
      const existing = readGuest(id);
      if ((existing?.revision ?? null) !== expectedRevision)
        throw new ApiError("shelf_conflict", 409);
      const draft = parseStudioDraft(content);
      const machine: SavedMachine = {
        id,
        courseId: null,
        revision: (expectedRevision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        content: draft,
        lastRun: parseRun(verifyStudioDraft(draft)),
      };
      localStorage.setItem(guestPrefix + id, JSON.stringify(machine));
      return machine;
    };
    // Each creation has its own key. Web Locks serialize revisions from different tabs.
    return navigator.locks
      ? navigator.locks.request(guestPrefix + id, save)
      : Promise.resolve(save());
  };
  return {
    async list() {
      const machines: SavedMachine[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(guestPrefix)) continue;
        const saved = readGuest(key.slice(guestPrefix.length));
        if (saved) machines.push(saved);
      }
      return machines.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async create(content) {
      return write(crypto.randomUUID(), content, null);
    },
    async revise(previous, content) {
      if (previous.courseId !== null) throw new Error("wrong_shelf");
      return write(previous.id, content, previous.revision);
    },
    async duplicate(previous, content = previous.content) {
      if (previous.courseId !== null || !readGuest(previous.id))
        throw new Error("wrong_shelf");
      return write(crypto.randomUUID(), content, null);
    },
  };
}

export function createStudioShelf(scope: StudioScope): StudioShelf {
  if (scope.mode === "guest") return guestShelf();
  const { courseId, studentId } = scope;
  const session = getPersonalBestSession();
  const requireSession = () => {
    if (
      !courseId ||
      !session ||
      session.userId !== studentId ||
      !isPersonalBestSessionCurrent(session)
    )
      throw new ApiError("shelf_session_changed", 401);
    return session;
  };
  const request = (path: string, body?: object): Promise<unknown> =>
    withRequestDeadline(async (signal) => {
      const owner = requireSession();
      const response = await fetch(join(API_BASE, machinesPath + path), {
        method: body ? "PUT" : "GET",
        signal,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${owner.token}`,
          ...(body && { "Content-Type": "application/json" }),
        },
        ...(body && { body: JSON.stringify(body) }),
      });
      if (!response.ok)
        throw new ApiError("shelf_request_failed", response.status);
      const data: unknown = await response.json();
      requireSession();
      return data;
    });
  const write = async (
    id: string,
    content: StudioDraft,
    expectedRevision: number | null,
    parentCreationId?: string,
  ) =>
    readMachine(
      await request("/" + encodeURIComponent(id), {
        courseId,
        content: parseStudioDraft(content),
        expectedRevision,
        parentCreationId,
      }),
      courseId,
      id,
    );

  // Reuse the creation ID if the server saved the machine but the response was lost.
  let pending: { key: string; id: string } | undefined;
  const create = async (content: StudioDraft, parentCreationId?: string) => {
    const key = JSON.stringify([parentCreationId, content]);
    if (pending?.key !== key) pending = { key, id: crypto.randomUUID() };
    const { id } = pending;
    const saved = await write(id, content, null, parentCreationId);
    if (pending?.id === id) pending = undefined;
    return saved;
  };
  return {
    async list() {
      const data = await request("?courseId=" + encodeURIComponent(courseId));
      if (!record(data) || !Array.isArray(data.machines))
        throw new Error("invalid_shelf");
      return data.machines.map((item: unknown) => readMachine(item, courseId));
    },
    create,
    async revise(previous, content) {
      if (previous.courseId !== courseId) throw new Error("wrong_shelf");
      return write(previous.id, content, previous.revision);
    },
    async duplicate(previous, content = previous.content) {
      if (previous.courseId !== courseId) throw new Error("wrong_shelf");
      return create(content, previous.id);
    },
  };
}
