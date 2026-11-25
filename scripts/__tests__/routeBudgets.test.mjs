import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { routeBudgets } from "../../src/build/routeBudgets.mjs";

function graph() {
  const files = [
    "main.tsx",
    "App.tsx",
    "pages/Index.tsx",
    "pages/LoginSelection.tsx",
    "pages/StudentClassLogin.tsx",
    "pages/TeacherLogin.tsx",
    "layouts/StudentLayout.tsx",
    "pages/ActivityPlayer.tsx",
    "components/games/TankTrekGame.tsx",
  ];
  const bundle = Object.fromEntries(
    files.map((id) => [
      id,
      {
        type: "chunk",
        fileName: id,
        moduleIds: ["/project/src/" + id],
        imports: [],
        dynamicImports: [],
        code: "export default 1",
      },
    ]),
  );
  bundle["main.tsx"].dynamicImports.push("App.tsx");
  bundle["App.tsx"].dynamicImports.push(...files.slice(2));
  return bundle;
}
const measure = (bundle) =>
  routeBudgets("/project").generateBundle.handler({}, bundle);
describe("cold route budgets", () => {
  it("excludes a game reached only by dynamic import", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(() => measure(graph())).not.toThrow();
      expect(log).toHaveBeenCalledTimes(6);
    } finally {
      log.mockRestore();
    }
  });
  it("detects a game imported by the lazy login route, even through a shared chunk", () => {
    const bundle = graph();
    bundle["pages/LoginSelection.tsx"].imports.push("bridge");
    bundle.bridge = {
      ...bundle["App.tsx"],
      fileName: "bridge",
      moduleIds: ["/project/shared.ts"],
      imports: ["components/games/TankTrekGame.tsx"],
    };
    expect(() => measure(bundle)).toThrow(
      /ROUTE_BOUNDARY: student login loads components\/games\/TankTrekGame/,
    );
  });
  it("counts CSS loaded by the unconditional bootstrap imports against startup", () => {
    const bundle = graph();
    bundle["App.tsx"].viteMetadata = { importedCss: new Set(["shared.css"]) };
    bundle["shared.css"] = { type: "asset", source: randomBytes(420 * 1024) };
    expect(() => measure(bundle)).toThrow(/ROUTE_BUDGET: startup/);
  });
});
