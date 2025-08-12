import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

vi.mock("@aws-sdk/client-secrets-manager", () => {
  class SecretsManagerClient {
    constructor(_: unknown) {}
    async send(_: unknown) {
      return {
        SecretString: JSON.stringify({
          host: "localhost",
          port: 5432,
          dbname: "test",
          username: "test",
          password: "test",
        }),
      };
    }
  }
  class GetSecretValueCommand {
    constructor(_: unknown) {}
  }
  return { SecretsManagerClient, GetSecretValueCommand };
});

vi.mock("pg", () => {
  class MockClient {
    async query() {
      return { rows: [] };
    }
    release() {}
  }
  class Pool {
    async connect() {
      return new MockClient();
    }
    async query() {
      return { rows: [] };
    }
    async end() {}
  }
  return { Pool };
});

afterEach(() => {
  cleanup();
});
