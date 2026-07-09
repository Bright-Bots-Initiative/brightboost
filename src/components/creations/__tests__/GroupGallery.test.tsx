import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GroupGallery from "../GroupGallery";

// Mock i18n
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue || key,
  }),
}));

// Mock useApi (GroupGallery imports ../../services/api)
const mockGet = vi.fn();
vi.mock("../../../services/api", () => ({
  useApi: () => ({
    get: mockGet,
    post: vi.fn(),
  }),
}));

const rideable = {
  v: 1,
  name: "Super Loop",
  grid: { w: 8, h: 8 },
  pieces: [
    { x: 1, y: 3, type: "start", rot: 0 },
    { x: 2, y: 3, type: "straight", rot: 0 },
    { x: 3, y: 3, type: "finish", rot: 0 },
  ],
};

function galleryItem(overrides: Record<string, unknown>) {
  return {
    id: "c1",
    type: "data_dash_challenge",
    title: "A Creation",
    status: "COMPLETE",
    encouragements: 0,
    authorId: "u1",
    authorName: "Ada",
    ...overrides,
  };
}

function renderGallery() {
  return render(
    <MemoryRouter>
      <GroupGallery courseId="course-1" canEncourage={false} />
    </MemoryRouter>,
  );
}

describe("GroupGallery — race_track cards (HARD REQUIREMENT: never crash)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("renders a race_track card with a polyline thumbnail and a Ride link", async () => {
    mockGet.mockResolvedValue([
      galleryItem({ type: "race_track", title: "Super Loop", content: rideable }),
    ]);
    const { container } = renderGallery();
    await waitFor(() => expect(screen.getByText("Super Loop")).toBeTruthy());
    expect(container.querySelector("svg polyline")).toBeTruthy();
    const ride = screen.getByText("Ride");
    expect(ride.closest("a")?.getAttribute("href")).toBe("/student/challenge/c1");
  });

  it("does NOT crash on a race_track card with malformed content — falls back to 🏍️", async () => {
    mockGet.mockResolvedValue([
      galleryItem({
        type: "race_track",
        title: "Broken Track",
        content: { totally: "wrong", pieces: "not-an-array" },
      }),
    ]);
    const { container } = renderGallery();
    await waitFor(() => expect(screen.getByText("Broken Track")).toBeTruthy());
    expect(container.querySelector("svg polyline")).toBeFalsy();
    expect(screen.getByText("🏍️")).toBeTruthy();
  });

  it("does NOT crash on a race_track card with missing content — falls back to 🏍️", async () => {
    mockGet.mockResolvedValue([
      galleryItem({ type: "race_track", title: "No Layout" }),
    ]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("No Layout")).toBeTruthy());
    expect(screen.getByText("🏍️")).toBeTruthy();
  });

  it("does NOT crash on a race_track track that isn't rideable (dangling road)", async () => {
    mockGet.mockResolvedValue([
      galleryItem({
        type: "race_track",
        title: "Dangling",
        content: {
          ...rideable,
          pieces: [
            { x: 1, y: 3, type: "start", rot: 0 },
            { x: 6, y: 6, type: "finish", rot: 0 },
          ],
        },
      }),
    ]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("Dangling")).toBeTruthy());
    expect(screen.getByText("🏍️")).toBeTruthy();
  });

  it("keeps the Play link for data_dash_challenge cards (no regression)", async () => {
    mockGet.mockResolvedValue([galleryItem({ title: "Sort It" })]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("Sort It")).toBeTruthy());
    expect(screen.getByText("gallery.play")).toBeTruthy();
  });
});
