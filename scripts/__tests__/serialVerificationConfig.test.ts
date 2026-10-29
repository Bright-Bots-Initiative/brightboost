/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@storybook/experimental-addon-test/vitest-plugin", () => ({
  storybookTest: () => [],
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function configurations(value: string) {
  vi.resetModules();
  vi.stubEnv("BB_TEST_SERIAL", value);
  vi.stubEnv("BB_VITEST_PATH_HAS_SPACE", "0");
  const unit = (await import("../../vitest.config")).default;
  const workspace = (await import("../../vitest.workspace")).default;
  return { unit, workspace };
}

describe("optional serial verification scheduling", () => {
  it("keeps normal project collection and default scheduling unchanged", async () => {
    const { unit, workspace } = await configurations("");
    expect(unit.test?.fileParallelism).toBeUndefined();
    expect(unit.test?.maxWorkers).toBeUndefined();
    expect(workspace).toHaveLength(4);
    expect(workspace[0]).toBe("vitest.config.ts");
    for (const project of workspace.slice(1)) {
      expect(typeof project).toBe("object");
      expect(project).not.toHaveProperty("test.sequence.groupOrder");
    }
  });

  it("orders every project without skipping Node, Chromium, or Storybook", async () => {
    const { unit, workspace } = await configurations("1");
    expect(unit.test).toMatchObject({
      name: "unit",
      fileParallelism: false,
      maxWorkers: 1,
      minWorkers: 1,
      sequence: { groupOrder: 0 },
    });
    expect(workspace).toHaveLength(4);
    for (const [index, name] of [
      "greatwork-engine",
      "greatwork-engine-browser",
      "storybook",
    ].entries()) {
      expect(workspace[index + 1]).toHaveProperty("test.name", name);
      expect(workspace[index + 1]).toHaveProperty(
        "test.fileParallelism",
        false,
      );
      expect(workspace[index + 1]).toHaveProperty("test.maxWorkers", 1);
      expect(workspace[index + 1]).toHaveProperty(
        "test.sequence.groupOrder",
        index + 1,
      );
    }
    expect(workspace[2]).toHaveProperty("test.browser.enabled", true);
    expect(workspace[3]).toHaveProperty("test.browser.enabled", true);
  });

  it("does not enable the override for other values", async () => {
    const { unit, workspace } = await configurations("true");
    expect(unit.test?.fileParallelism).toBeUndefined();
    expect(workspace[1]).not.toHaveProperty("test.sequence.groupOrder");
  });
});
