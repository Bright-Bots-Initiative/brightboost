/* @vitest-environment node */
/**
 * Regression guard for the legacy Lambda signup handlers
 * (src/lambda/teacher-signup.ts, src/lambda/student-signup.ts).
 *
 * Each handler writes the Prisma-managed "User" table and the legacy `users`
 * table. They used to swallow a failed "User" insert and still return 201 with
 * a token; they now write both rows in one transaction and fail the signup,
 * with no token, when either insert fails.
 *
 * `pg` is replaced by an in-memory fake that honours BEGIN / COMMIT / ROLLBACK,
 * so the assertions are about what ends up committed, not only about which
 * statements were sent. The Secrets Manager client is mocked in
 * src/test/setup.ts.
 *
 * This file lives outside src/lambda on purpose: src/lambda/tsconfig.json
 * compiles every .ts file under that directory into the Lambda build.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handler as studentSignup } from "../lambda/student-signup";
import { handler as teacherSignup } from "../lambda/teacher-signup";

type Table = "User" | "users";
type Row = Record<string, unknown>;

const fakeDb = vi.hoisted(() => {
  const committed: Record<Table, Row[]> = { User: [], users: [] };
  const failOn: Record<string, Error | undefined> = {};
  const poolStatements: string[] = [];
  let nextUsersId = 1;

  function label(sql: string): string {
    const text = sql.replace(/\s+/g, " ").trim();
    const match = text.match(
      /^(BEGIN|COMMIT|ROLLBACK|SELECT EXISTS|INSERT INTO \S+|SELECT id FROM \S+)/,
    );
    return match ? match[1] : text;
  }

  class FakeClient {
    statements: string[] = [];
    /** Rows written since BEGIN; null outside a transaction (autocommit). */
    pending: Array<[Table, Row]> | null = null;
    released = false;
    releasedWith: unknown = undefined;

    async query(sql: string, params: unknown[] = []) {
      const statement = label(sql);
      this.statements.push(statement);
      const failure = failOn[statement];
      if (failure) throw failure;

      const write = (table: Table, row: Row) => {
        if (this.pending) this.pending.push([table, row]);
        else committed[table].push(row);
      };

      switch (statement) {
        case "BEGIN":
          this.pending = [];
          return { rows: [] };
        case "COMMIT":
          for (const [table, row] of this.pending ?? []) {
            committed[table].push(row);
          }
          this.pending = null;
          return { rows: [] };
        case "ROLLBACK":
          this.pending = null;
          return { rows: [] };
        case "SELECT EXISTS":
          return { rows: [{ exists: true }] };
        case "SELECT id FROM users":
          return {
            rows: committed.users.filter((row) => row.email === params[0]),
          };
        case 'SELECT id FROM "User"':
          return {
            rows: committed.User.filter((row) => row.email === params[0]),
          };
        case 'INSERT INTO "User"':
          write("User", { id: params[0], name: params[1], email: params[2] });
          return { rows: [] };
        case "INSERT INTO users": {
          const row = {
            id: nextUsersId++,
            name: params[0],
            email: params[1],
            role: params[3],
            school: params[4],
            subject: params[5],
            created_at: "2026-01-01T00:00:00.000Z",
          };
          write("users", row);
          return { rows: [row] };
        }
        default:
          throw new Error(`fake pg: unexpected statement: ${statement}`);
      }
    }

    release(error?: unknown) {
      this.released = true;
      this.releasedWith = error;
    }
  }

  const clients: FakeClient[] = [];

  class Pool {
    async connect() {
      const client = new FakeClient();
      clients.push(client);
      return client;
    }

    async query(sql: string, params: unknown[] = []) {
      const autocommit = new FakeClient();
      const result = await autocommit.query(sql, params);
      poolStatements.push(...autocommit.statements);
      return result;
    }
  }

  function reset() {
    committed.User.length = 0;
    committed.users.length = 0;
    poolStatements.length = 0;
    clients.length = 0;
    for (const key of Object.keys(failOn)) delete failOn[key];
  }

  /** Clients the handler opened a transaction on. */
  function transactionClients() {
    return clients.filter((client) => client.statements[0] === "BEGIN");
  }

  return {
    Pool,
    clients,
    committed,
    failOn,
    poolStatements,
    reset,
    transactionClients,
  };
});

vi.mock("pg", () => ({ Pool: fakeDb.Pool }));

// A real cost-12 hash takes hundreds of milliseconds per call and is not what
// these tests are about.
vi.mock("bcryptjs", () => ({ hash: vi.fn(async () => "hashed-password") }));

const EMAIL = "ada@example.com";

function signupEvent() {
  return {
    httpMethod: "POST",
    body: JSON.stringify({
      name: "Ada Lovelace",
      email: EMAIL,
      password: "correct-horse-battery",
    }),
  } as Parameters<typeof teacherSignup>[0];
}

describe.each([
  { kind: "Teacher", handler: teacherSignup, role: "TEACHER" },
  { kind: "Student", handler: studentSignup, role: "STUDENT" },
])("$kind signup lambda", ({ kind, handler, role }) => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeDb.reset();
    vi.stubEnv("DATABASE_SECRET_ARN", "arn:aws:secretsmanager:test");
    vi.stubEnv("JWT_SECRET", "test-jwt-secret");
    vi.spyOn(console, "log").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("commits both rows in one transaction and returns 201 with a token", async () => {
    const result = await handler(signupEvent());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ email: EMAIL, role });

    expect(fakeDb.committed.User).toHaveLength(1);
    expect(fakeDb.committed.users).toHaveLength(1);
    const [client] = fakeDb.transactionClients();
    expect(client.statements).toEqual([
      "BEGIN",
      'INSERT INTO "User"',
      "INSERT INTO users",
      "COMMIT",
    ]);
    expect(fakeDb.poolStatements).not.toContainEqual(
      expect.stringMatching(/^INSERT/),
    );
    expect(fakeDb.clients.every((c) => c.released)).toBe(true);
  });

  it.each([
    {
      failure: new Error('relation "User" does not exist'),
      statusCode: 500,
    },
    {
      failure: new Error(
        'duplicate key value violates unique constraint "User_email_key"',
      ),
      statusCode: 409,
    },
  ])(
    'a failed "User" insert ($failure.message) rolls back and returns $statusCode with no token',
    async ({ failure, statusCode }) => {
      fakeDb.failOn['INSERT INTO "User"'] = failure;

      const result = await handler(signupEvent());

      expect(result.statusCode).toBe(statusCode);
      expect(JSON.parse(result.body)).not.toHaveProperty("token");

      const [client] = fakeDb.transactionClients();
      expect(client.statements).toEqual([
        "BEGIN",
        'INSERT INTO "User"',
        "ROLLBACK",
      ]);
      expect(client.released).toBe(true);
      expect(fakeDb.committed.User).toHaveLength(0);
      expect(fakeDb.committed.users).toHaveLength(0);
      expect(consoleError).toHaveBeenCalledWith(
        `${kind} signup error:`,
        failure,
      );
    },
  );

  it('a failed users insert rolls back the "User" row and returns no token', async () => {
    fakeDb.failOn["INSERT INTO users"] = new Error("users insert failed");

    const result = await handler(signupEvent());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).not.toHaveProperty("token");

    const [client] = fakeDb.transactionClients();
    expect(client.statements).toEqual([
      "BEGIN",
      'INSERT INTO "User"',
      "INSERT INTO users",
      "ROLLBACK",
    ]);
    expect(client.released).toBe(true);
    expect(fakeDb.committed.User).toHaveLength(0);
    expect(fakeDb.committed.users).toHaveLength(0);
  });

  it("a failed ROLLBACK keeps the insert error's status and discards the client", async () => {
    fakeDb.failOn['INSERT INTO "User"'] = new Error(
      'duplicate key value violates unique constraint "User_email_key"',
    );
    const rollbackFailure = new Error("Connection terminated unexpectedly");
    fakeDb.failOn["ROLLBACK"] = rollbackFailure;

    const result = await handler(signupEvent());

    // The rollback error mentions "connection", which the handler maps to 503;
    // the duplicate-key insert error must win and map to 409.
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body)).not.toHaveProperty("token");

    const [client] = fakeDb.transactionClients();
    expect(client.released).toBe(true);
    expect(client.releasedWith).toBe(rollbackFailure);
  });

  it('an email that exists only in "User" returns 409 without writing', async () => {
    fakeDb.committed.User.push({ id: "prisma-user", email: EMAIL });

    const result = await handler(signupEvent());

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body)).toEqual({
      error: "User with this email already exists",
    });
    expect(fakeDb.transactionClients()).toHaveLength(0);
    expect(fakeDb.committed.User).toHaveLength(1);
    expect(fakeDb.committed.users).toHaveLength(0);
  });
});
