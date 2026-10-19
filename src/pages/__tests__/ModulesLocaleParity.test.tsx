import { afterEach, describe, expect, it, vi as vitest } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Modules from "../Modules";
import i18n from "@/i18n";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import vi from "@/locales/vi/common.json";
import zh from "@/locales/zh-CN/common.json";

vitest.mock("@/services/api", () => ({
  api: {
    getModules: vitest.fn().mockResolvedValue([]),
    getAvatar: vitest.fn().mockResolvedValue(null),
    getProgress: vitest.fn().mockResolvedValue({ progress: [] }),
    getStudentAssignments: vitest.fn().mockResolvedValue([]),
    getModule: vitest.fn().mockResolvedValue({ units: [] }),
  },
}));
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

function leafKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return item && typeof item === "object" ? leafKeys(item, path) : [path];
  });
}
describe("#865 — Modules namespace parity", () => {
  it("renders the coming-soon step in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(
      <MemoryRouter>
        <Modules />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Próximamente")).toBeInTheDocument();
    expect(screen.queryByText("Soon")).toBeNull();
  });
  it.each([
    ["es", es],
    ["vi", vi],
    ["zh-CN", zh],
  ] as const)("has every English Modules key in %s", (_lang, locale) => {
    expect(leafKeys(locale.modules).sort()).toEqual(
      leafKeys(en.modules).sort(),
    );
  });
});
