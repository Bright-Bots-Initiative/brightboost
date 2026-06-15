import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import StudentClassLogin from "../StudentClassLogin";

// Resolve i18n keys to real English text so assertions match the UI.
vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

// Auth context — we only need a stable `login` stub for this flow.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

// Presentational shells — keep the test focused on the code-entry logic.
vi.mock("../../components/GameBackground", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../components/LanguageToggle", () => ({ default: () => null }));

const mockClass = {
  courseId: "course-1",
  className: "Ms. Frizzle's Class",
  teacherName: "Ms. Frizzle",
  defaultLanguage: "en",
  students: [{ id: "s1", name: "Ada Lovelace", loginIcon: "🦊", hasPin: false }],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/class-login" element={<StudentClassLogin />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StudentClassLogin — single code entry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      if (String(url).includes("/classes/by-code/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockClass),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      } as Response);
    }) as unknown as typeof fetch;
  });

  it("consumes ?code= from the unified login and skips the code screen", async () => {
    renderAt("/class-login?code=STARS1");

    // Lands straight on the icon picker — the code screen is never shown.
    expect(await screen.findByText("Find your icon!")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("ABC123")).toBeNull();

    // It looked the class up using the code carried over in the URL.
    const calledUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => String(c[0]),
    );
    expect(calledUrls.some((u) => u.includes("/classes/by-code/STARS1"))).toBe(true);
  });

  it("still asks for the code when none is supplied (direct visit)", () => {
    renderAt("/class-login");

    // Code screen renders, and no lookup fires until the student submits.
    expect(screen.getByPlaceholderText("ABC123")).toBeInTheDocument();
    expect(screen.queryByText("Find your icon!")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
