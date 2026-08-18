/* @vitest-environment node */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptRel = "scripts/e2e-seed.mjs";

class ProcessExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit:${code}`);
    this.code = code;
  }
}

type MockFn = ReturnType<typeof vi.fn>;
type ModelMock = {
  findMany: MockFn;
  findUnique: MockFn;
  deleteMany: MockFn;
  delete: MockFn;
  create: MockFn;
};
type MockPrisma = {
  assignment: ModelMock;
  pulseResponse: ModelMock;
  benchmarkAssignment: ModelMock;
  benchmarkAttempt: ModelMock;
  classModuleAssignment: ModelMock;
  creation: ModelMock;
  enrollment: ModelMock;
  course: ModelMock;
  user: ModelMock;
  module: ModelMock;
  unit: ModelMock;
  lesson: ModelMock;
  activity: ModelMock;
  progress: ModelMock;
  $disconnect: MockFn;
};

type SeedMod = {
  requireDatabaseUrl: () => string;
  isProductionShapedDatabaseUrl: (url: string) => boolean;
  assertE2ETeacherEmail: () => string;
  resetE2E: (prisma: MockPrisma) => Promise<void>;
  runE2E: (prisma: MockPrisma, opts?: { reset?: boolean }) => Promise<void>;
};

const ENV_KEYS = [
  "DATABASE_URL",
  "E2E_TEACHER_EMAIL",
  "E2E_TEACHER_PASSWORD",
] as const;

function createModel(): ModelMock {
  return {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    delete: vi.fn(async () => ({})),
    create: vi.fn(async () => ({ id: "new" })),
  };
}

function createMockPrisma(): MockPrisma {
  return {
    assignment: createModel(),
    pulseResponse: createModel(),
    benchmarkAssignment: createModel(),
    benchmarkAttempt: createModel(),
    classModuleAssignment: createModel(),
    creation: createModel(),
    enrollment: createModel(),
    course: createModel(),
    user: createModel(),
    module: createModel(),
    unit: createModel(),
    lesson: createModel(),
    activity: createModel(),
    progress: createModel(),
    $disconnect: vi.fn(async () => {}),
  };
}

function prismaCallCount(prisma: MockPrisma): number {
  let n = 0;
  n += prisma.$disconnect.mock.calls.length;
  const models: ModelMock[] = [
    prisma.assignment,
    prisma.pulseResponse,
    prisma.benchmarkAssignment,
    prisma.benchmarkAttempt,
    prisma.classModuleAssignment,
    prisma.creation,
    prisma.enrollment,
    prisma.course,
    prisma.user,
    prisma.module,
    prisma.unit,
    prisma.lesson,
    prisma.activity,
    prisma.progress,
  ];
  for (const model of models) {
    n += model.findMany.mock.calls.length;
    n += model.findUnique.mock.calls.length;
    n += model.deleteMany.mock.calls.length;
    n += model.delete.mock.calls.length;
    n += model.create.mock.calls.length;
  }
  return n;
}

function idsInDeleteArgs(prisma: MockPrisma): string[] {
  const ids: string[] = [];
  const deleteFns: MockFn[] = [
    prisma.course.deleteMany,
    prisma.assignment.deleteMany,
    prisma.pulseResponse.deleteMany,
    prisma.enrollment.deleteMany,
    prisma.creation.deleteMany,
    prisma.classModuleAssignment.deleteMany,
    prisma.benchmarkAssignment.deleteMany,
    prisma.benchmarkAttempt.deleteMany,
  ];
  for (const fn of deleteFns) {
    for (const [arg] of fn.mock.calls) {
      const where = (arg as { where?: Record<string, unknown> } | undefined)
        ?.where;
      if (!where) {
        continue;
      }
      for (const value of Object.values(where)) {
        if (
          value &&
          typeof value === "object" &&
          Array.isArray((value as { in?: unknown }).in)
        ) {
          for (const id of (value as { in: unknown[] }).in) {
            ids.push(String(id));
          }
        }
      }
    }
  }
  return ids;
}

function runSeedCli(
  env: NodeJS.ProcessEnv,
  args: string[] = [],
  timeoutMs = 15_000,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptRel, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, timeoutMs);
    child.stdout?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.stderr?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: 2, output: output + `\n${err.message}` });
    });
  });
}

function exitCodeOf(fn: () => unknown): number {
  try {
    fn();
  } catch (err) {
    if (err instanceof ProcessExitError) {
      return err.code;
    }
    throw err;
  }
  throw new Error("expected process.exit, but the function returned");
}

async function exitCodeOfAsync(fn: () => Promise<unknown>): Promise<number> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ProcessExitError) {
      return err.code;
    }
    throw err;
  }
  throw new Error("expected process.exit, but the function resolved");
}

describe("e2e-seed destructive-write guards (round 3)", () => {
  let seed: SeedMod;
  let savedEnv: Record<(typeof ENV_KEYS)[number], string | undefined>;
  const logs: string[] = [];

  beforeAll(async () => {
    seed = (await import(
      pathToFileURL(path.join(repoRoot, scriptRel)).href
    )) as SeedMod;
  });

  beforeEach(() => {
    savedEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      E2E_TEACHER_EMAIL: process.env.E2E_TEACHER_EMAIL,
      E2E_TEACHER_PASSWORD: process.env.E2E_TEACHER_PASSWORD,
    };
    delete process.env.DATABASE_URL;
    delete process.env.E2E_TEACHER_EMAIL;
    delete process.env.E2E_TEACHER_PASSWORD;
    logs.length = 0;
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ProcessExitError(Number(code ?? 0));
    }) as typeof process.exit);
    const capture = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    vi.spyOn(console, "log").mockImplementation(capture);
    vi.spyOn(console, "error").mockImplementation(capture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("1: localhost /brightboost exits 1 with zero Prisma calls", async () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/brightboost";
    const prisma = createMockPrisma();
    const code = await exitCodeOfAsync(() => seed.runE2E(prisma));
    expect(code).toBe(1);
    expect(prismaCallCount(prisma)).toBe(0);
    expect(logs.join("\n")).toMatch(/No writes performed/);
    expect(logs.join("\n")).toMatch(/database "brightboost"/);
  });

  it("2: contest is refused (token boundary, not substring)", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/contest";
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).toBe(1);
  });

  it("3: latest is refused", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/latest";
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).toBe(1);
  });

  it("4: brightboost_test on localhost proceeds past the URL guard", () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/brightboost_test";
    expect(seed.requireDatabaseUrl()).toBe(
      "postgresql://u:p@localhost:5432/brightboost_test",
    );
  });

  it("5: e2e_db on localhost proceeds past the URL guard", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/e2e_db";
    expect(seed.requireDatabaseUrl()).toBe(
      "postgresql://u:p@localhost:5432/e2e_db",
    );
  });

  it("6: test in the host does not qualify; name is taken from the path", () => {
    process.env.DATABASE_URL = "postgresql://u:p@test.example.com/brightboost";
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).toBe(1);
  });

  it("7: test-named DB on a production host is still refused", () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@db.prod.supabase.co/brightboost_test";
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).toBe(1);
  });

  it("8: unparseable URL exits 2, not 1", () => {
    process.env.DATABASE_URL = "not-a-url";
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).toBe(2);
    expect(exitCodeOf(() => seed.requireDatabaseUrl())).not.toBe(1);
  });

  it("9: password in the URL appears in no output stream", async () => {
    process.env.DATABASE_URL =
      "postgresql://u:hunter2@localhost:5432/brightboost";
    exitCodeOf(() => seed.requireDatabaseUrl());
    const captured = logs.join("\n");
    expect(captured).not.toMatch(/hunter2/);
    expect(captured).not.toMatch(/postgresql:\/\/u:/);

    const { status, output } = await runSeedCli({
      ...process.env,
      DATABASE_URL: "postgresql://u:hunter2@localhost:5432/brightboost",
    });
    expect(status).toBe(1);
    expect(output).not.toMatch(/hunter2/);
    expect(output).not.toMatch(/postgresql:\/\/u:/);
  });

  it("10: --reset with a school email exits 1 with zero deletes", async () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/brightboost_test";
    process.env.E2E_TEACHER_EMAIL = "teacher@school.edu";
    const prisma = createMockPrisma();
    const code = await exitCodeOfAsync(() =>
      seed.runE2E(prisma, { reset: true }),
    );
    expect(code).toBe(1);
    expect(prismaCallCount(prisma)).toBe(0);
    expect(prisma.course.deleteMany.mock.calls.length).toBe(0);
    expect(prisma.course.findMany.mock.calls.length).toBe(0);
  });

  it("11: --reset with E2E_TEACHER_EMAIL unset exits 2", async () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/brightboost_test";
    const prisma = createMockPrisma();
    const code = await exitCodeOfAsync(() =>
      seed.runE2E(prisma, { reset: true }),
    );
    expect(code).toBe(2);
    expect(prismaCallCount(prisma)).toBe(0);
  });

  it("12: E2E001 owned by real@school.edu survives and the skip is logged", async () => {
    process.env.E2E_TEACHER_EMAIL = "teacher@e2e.invalid";
    const survivingId = "survive-prod-e2e001";
    const prisma = createMockPrisma();
    prisma.course.findMany.mockResolvedValueOnce([
      { id: survivingId, teacher: { email: "real@school.edu" } },
    ]);
    await seed.resetE2E(prisma);
    expect(idsInDeleteArgs(prisma)).not.toContain(survivingId);
    expect(logs.join("\n")).toMatch(/SKIPPING E2E001/);
    expect(logs.join("\n")).toMatch(survivingId);
    expect(logs.join("\n")).toMatch(/real@school\.edu/);
  });

  it("13: E2E001 owned by t@e2e.invalid is still deleted", async () => {
    process.env.E2E_TEACHER_EMAIL = "t@e2e.invalid";
    const e2eId = "e2e-owned-course";
    const prisma = createMockPrisma();
    prisma.course.findMany.mockResolvedValueOnce([
      { id: e2eId, teacher: { email: "t@e2e.invalid" } },
    ]);
    await seed.resetE2E(prisma);
    expect(idsInDeleteArgs(prisma)).toContain(e2eId);
  });
});
