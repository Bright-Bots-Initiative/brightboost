import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomeAccessCard } from "../HomeAccessCard";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  }),
}));

// Mock useApi
const mockPost = vi.fn();
vi.mock("@/services/api", () => ({
  useApi: () => ({
    post: mockPost,
  }),
}));

// Mock UI components that may cause issues in test env
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe("HomeAccessCard", () => {
  it("renders the form fields", () => {
    render(<HomeAccessCard />);

    expect(screen.getByLabelText("Home login email")).toBeDefined();
    expect(
      screen.getByLabelText("Parent or guardian email (optional)"),
    ).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Enable Home Access" }),
    ).toBeDefined();
  });

  it("submits the form and shows success message", async () => {
    mockPost.mockResolvedValueOnce({ ok: true });

    render(<HomeAccessCard />);

    fireEvent.change(screen.getByLabelText("Home login email"), {
      target: { value: "parent@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "securepass" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enable Home Access" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Home access is ready/),
      ).toBeDefined();
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/auth/home-access/enable",
      expect.objectContaining({
        email: "parent@example.com",
        managedByParent: true,
      }),
    );
  });

  it("shows error message on failure", async () => {
    mockPost.mockRejectedValueOnce(new Error("Email already in use"));

    render(<HomeAccessCard />);

    fireEvent.change(screen.getByLabelText("Home login email"), {
      target: { value: "taken@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "securepass" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enable Home Access" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Email already in use"),
      ).toBeDefined();
    });
  });
});
