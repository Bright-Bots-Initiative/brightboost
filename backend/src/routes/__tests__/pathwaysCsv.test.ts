import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({
  loadFacilitatorScope: vi.fn(),
  loadVisibleMilestones: vi.fn(),
}));
vi.mock("../../services/pathwaysAccess", async (original) => ({
  ...(await original<typeof import("../../services/pathwaysAccess")>()),
  ...access,
}));
import router from "../pathways";

const app = express();
app.use((req, _res, next) => {
  req.user = { id: "teacher", role: "teacher" };
  next();
});
app.use(router);
const exportRoster = () =>
  request(app).get("/pathways/facilitator/cohorts/class/export");

function roster(name: string) {
  access.loadFacilitatorScope.mockResolvedValue({
    cohorts: [{ id: "class", name: "Class" }],
    enrollments: [
      {
        userId: "learner",
        status: "active",
        user: { name, email: "learner@example.com", ageBand: "explorer" },
      },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  access.loadVisibleMilestones.mockResolvedValue(new Map());
});

describe("#886 — actual roster CSV response", () => {
  it("keeps ordinary names, quotes, commas and numeric columns intact", async () => {
    roster('Ana, "AJ"');
    const res = await exportRoster();
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain(
      '"Ana, ""AJ""","learner@example.com","explorer","0","","","active"',
    );
  });

  it.each([
    "=1+1",
    "+1+1",
    "-1+1",
    "@SUM(1)",
    " \t=1+1",
    "\r\n=1+1",
    "\u0000=1+1",
    "＝1+1",
  ])("exports a formula-shaped name as literal text: %j", async (name) => {
    roster(name);
    const res = await exportRoster();
    expect(res.status).toBe(200);
    // The defensive text prefix is inside the quoted field.
    expect(res.text).toContain(`"'\t${name.replace(/"/g, '""')}"`);
  });

  it("keeps the existing facilitator scope requirement", async () => {
    access.loadFacilitatorScope.mockResolvedValue(null);
    expect((await exportRoster()).status).toBe(404);
    expect(access.loadVisibleMilestones).not.toHaveBeenCalled();
  });
});
