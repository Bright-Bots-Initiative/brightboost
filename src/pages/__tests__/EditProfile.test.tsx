/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import EditProfile from "../EditProfile";
import * as apiModule from "../../services/api";

const renderWithApiMock = (profile: any, postSpy: any) => {
  vi.spyOn(apiModule, "useApi").mockReturnValue({
    get: vi.fn().mockResolvedValue(profile),
    post: postSpy,
    put: vi.fn(),
    delete: vi.fn(),
  } as any);
  render(<EditProfile />);
};

describe("EditProfile role-based rendering and submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders teacher fields and sends bio/school/subject for teacher", async () => {
    const postSpy = vi.fn().mockResolvedValue({ ok: true });
    renderWithApiMock({ avatar: "url", role: "teacher" }, postSpy);

    await waitFor(() =>
      expect(screen.getByAltText("profile picture")).toBeInTheDocument(),
    );

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("School")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Subject")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Bio")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("School"), {
      target: { value: "High School" },
    });
    fireEvent.change(screen.getByPlaceholderText("Subject"), {
      target: { value: "Math" },
    });
    fireEvent.change(screen.getByPlaceholderText("Bio"), {
      target: { value: "Veteran teacher" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith("/api/edit-profile", {
        role: "teacher",
        name: "Alice",
        school: "High School",
        subject: "Math",
        bio: "Veteran teacher",
        grade: "blank",
      }),
    );
  });

  it("hides teacher fields and includes grade only for student", async () => {
    const postSpy = vi.fn().mockResolvedValue({ ok: true });
    renderWithApiMock({ avatar: "url", role: "student" }, postSpy);

    await waitFor(() =>
      expect(screen.getByAltText("profile picture")).toBeInTheDocument(),
    );

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("School")).toBeNull();
    expect(screen.queryByPlaceholderText("Subject")).toBeNull();
    expect(screen.queryByPlaceholderText("Bio")).toBeNull();

    expect(screen.getByPlaceholderText("Grade")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Grade"), {
      target: { value: "8" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith("/api/edit-profile", {
        role: "student",
        name: "Bob",
        school: "blank",
        subject: "blank",
        bio: "blank",
        grade: "8",
      }),
    );
  });
});
