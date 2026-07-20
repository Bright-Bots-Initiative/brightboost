import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GroupGallery from "../GroupGallery";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
}));

const mockGet = vi.fn();
vi.mock("../../../services/api", () => ({
  useApi: () => ({ get: mockGet, post: vi.fn() }),
}));

function item(overrides: Record<string, unknown>) {
  return {
    id: "d1",
    type: "sound_duet",
    title: "Midnight Parade",
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

describe("GroupGallery — sound_duet cards (HARD REQUIREMENT: never crash)", () => {
  beforeEach(() => mockGet.mockReset());

  it("renders a duet card with its cover pose and a Watch / Listen link (never autoplay)", async () => {
    mockGet.mockResolvedValue([
      item({ content: { coverPose: "highFive" } }),
    ]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("Midnight Parade")).toBeTruthy());
    expect(screen.getByText("🙌")).toBeTruthy();
    const link = screen.getByText("Watch / Listen");
    expect(link.closest("a")?.getAttribute("href")).toBe("/student/challenge/d1");
    // no <audio>, no autoplay anything — the card is inert until tapped
    expect(document.querySelector("audio, video")).toBeNull();
  });

  it("does NOT crash on malformed content — falls back to 🎙️", async () => {
    mockGet.mockResolvedValue([
      item({ title: "Broken Duet", content: { coverPose: 42, layers: "nope" } }),
    ]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("Broken Duet")).toBeTruthy());
    expect(screen.getByText("🎙️")).toBeTruthy();
  });

  it("does NOT crash on missing content — falls back to 🎙️", async () => {
    mockGet.mockResolvedValue([item({ title: "No Payload" })]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("No Payload")).toBeTruthy());
    expect(screen.getByText("🎙️")).toBeTruthy();
  });

  it("keeps the Play link for data_dash_challenge cards (no regression)", async () => {
    mockGet.mockResolvedValue([
      item({ id: "c9", type: "data_dash_challenge", title: "Sort It" }),
    ]);
    renderGallery();
    await waitFor(() => expect(screen.getByText("Sort It")).toBeTruthy());
    expect(screen.getByText("gallery.play")).toBeTruthy();
  });
});
