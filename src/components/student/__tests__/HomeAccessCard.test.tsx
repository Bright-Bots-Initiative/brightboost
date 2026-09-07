import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomeAccessCard } from "../HomeAccessCard";

/**
 * #872 — the student settings card never offers a form that could bind or
 * replace home credentials from a classroom session. What it shows depends on
 * `homeAccessEnabled` and the session provenance claim in the JWT.
 */

// Mock i18n
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({
    // Return the key so assertions can name the exact copy key that renders,
    // including error keys that carry a generic defaultValue fallback.
    t: (key: string) => key,
  }),
}));

// Mock the home-access request helper (keeps server denial codes as messages)
const mockPost = vi.fn();
vi.mock("@/services/homeAccessApi", () => ({
  postHomeAccess: (...args: unknown[]) => mockPost(...args),
}));

// Mock auth context: the test controls the user and the token.
const mockAuth = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    role: string;
    homeAccessEnabled?: boolean;
  },
  token: null as string | null,
  updateUser: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

/** Unsigned JWT-shaped token whose payload carries the given `auth` claim. */
function tokenWith(auth?: string) {
  const b64 = (s: string) =>
    btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload: Record<string, unknown> = { id: "student-1", role: "student" };
  if (auth) payload.auth = auth;
  return `${b64(JSON.stringify({ alg: "HS256" }))}.${b64(JSON.stringify(payload))}.sig`;
}

describe("HomeAccessCard (#872)", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockAuth.updateUser.mockReset();
  });

  it("shows setup guidance and no form when home access is not set up", () => {
    mockAuth.user = {
      id: "student-1",
      role: "student",
      homeAccessEnabled: false,
    };
    mockAuth.token = tokenWith("class_code");
    render(<HomeAccessCard />);

    expect(screen.getByTestId("home-access-setup")).toBeDefined();
    expect(screen.getByText("homeAccess.setup.body")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("form")).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("shows only a notice for a classroom (PIN) session even when home access is on", () => {
    mockAuth.user = {
      id: "student-1",
      role: "student",
      homeAccessEnabled: true,
    };
    mockAuth.token = tokenWith("class_code_pin");
    render(<HomeAccessCard />);

    expect(screen.getByTestId("home-access-classroom-notice")).toBeDefined();
    expect(document.querySelector("form")).toBeNull();
  });

  it("shows only a notice for a legacy token without a provenance claim", () => {
    mockAuth.user = {
      id: "student-1",
      role: "student",
      homeAccessEnabled: true,
    };
    mockAuth.token = tokenWith(undefined);
    render(<HomeAccessCard />);

    expect(screen.getByTestId("home-access-classroom-notice")).toBeDefined();
    expect(document.querySelector("form")).toBeNull();
  });

  it("lets a home (password) session update the login after re-entering the current password", async () => {
    mockAuth.user = {
      id: "student-1",
      role: "student",
      homeAccessEnabled: true,
    };
    mockAuth.token = tokenWith("password");
    mockPost.mockResolvedValueOnce({
      ok: true,
      user: { email: "new@example.com" },
    });
    render(<HomeAccessCard />);

    fireEvent.change(
      screen.getByLabelText("homeAccess.manage.currentPassword"),
      {
        target: { value: "Current123" },
      },
    );
    fireEvent.change(screen.getByLabelText("homeAccess.manage.newEmail"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "homeAccess.manage.save" }),
    );

    await waitFor(() => {
      expect(screen.getByText("homeAccess.manage.success")).toBeDefined();
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/home-access/credentials",
      { currentPassword: "Current123", email: "new@example.com" },
      mockAuth.token,
    );
    expect(mockAuth.updateUser).toHaveBeenCalledWith({
      email: "new@example.com",
    });
  });

  it("maps a server denial code to copy and keeps the form", async () => {
    mockAuth.user = {
      id: "student-1",
      role: "student",
      homeAccessEnabled: true,
    };
    mockAuth.token = tokenWith("password");
    mockPost.mockRejectedValueOnce(new Error("invalid_current_password"));
    render(<HomeAccessCard />);

    fireEvent.change(
      screen.getByLabelText("homeAccess.manage.currentPassword"),
      {
        target: { value: "Wrong" },
      },
    );
    fireEvent.change(screen.getByLabelText("homeAccess.manage.newPassword"), {
      target: { value: "NewPassword1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "homeAccess.manage.save" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("homeAccess.errors.invalid_current_password"),
      ).toBeDefined();
    });
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it("renders nothing for a non-student", () => {
    mockAuth.user = { id: "t-1", role: "teacher" };
    mockAuth.token = tokenWith("password");
    const { container } = render(<HomeAccessCard />);
    expect(container.innerHTML).toBe("");
  });
});
