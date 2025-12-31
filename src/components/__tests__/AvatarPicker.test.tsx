import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AvatarPicker from "../AvatarPicker";

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");

// Mock the UI components to avoid testing Radix internals
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div className={className} data-testid="avatar-root">
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: any) => (
    <img src={src} alt={alt} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

describe("AvatarPicker", () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.setItem("bb_access_token", "test-token");

    // Mock Image for crop/compress (logic inside the component)
    originalImage = global.Image;
    global.Image = class extends originalImage {
      constructor() {
        super();
        setTimeout(() => {
          if (this.onload) {
            this.onload(new Event("load"));
          }
        }, 0);
      }
      // Add minimal properties needed
      width = 100;
      height = 100;
    } as any;

    // Mock Canvas
    // We mock the prototype so any created canvas has these methods
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as any);

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: any) => {
        callback(new Blob(["test"], { type: "image/webp" }));
      },
    );
  });

  afterEach(() => {
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  it("renders with initials when no avatar is provided", () => {
    render(<AvatarPicker userInitials="JD" />);
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("JD");
  });

  it("renders with avatar image when provided", () => {
    const avatarUrl = "https://example.com/avatar.png";
    render(<AvatarPicker userInitials="JD" currentAvatarUrl={avatarUrl} />);

    const img = screen.getByTestId("avatar-image");
    expect(img).toHaveAttribute("src", avatarUrl);
  });

  it("handles file selection and upload process", async () => {
    // Mock fetch for upload (PUT) and patch (PATCH)
    // The component has a hardcoded getPresignedUrlStub returning "https://stub-bucket.s3.amazonaws.com/avatar"

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
      } as Response) // PUT to S3
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response); // PATCH to /api/user/avatar

    const onAvatarChange = vi.fn();
    render(<AvatarPicker userInitials="JD" onAvatarChange={onAvatarChange} />);

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await waitFor(() =>
      fireEvent.change(fileInput, { target: { files: [file] } }),
    );

    // Expect loading state
    expect(
      screen.getByRole("status", { name: /uploading avatar/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      // The component returns the final URL which is the presigned URL stripped of query params
      expect(onAvatarChange).toHaveBeenCalledWith(
        "https://stub-bucket.s3.amazonaws.com/avatar",
      );
    });
  });
});
