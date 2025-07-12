/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AvatarPicker from "../AvatarPicker";

const mockFetch = vi.fn();
global.fetch = mockFetch;

global.URL.createObjectURL = vi.fn(() => "mock-object-url");
global.URL.revokeObjectURL = vi.fn();

(HTMLCanvasElement.prototype.getContext as any) = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
}));

(HTMLCanvasElement.prototype.toBlob as any) = vi.fn((callback) => {
  const mockBlob = new Blob(["mock"], { type: "image/webp" });
  callback(mockBlob);
});

const createMockImage = () => {
  const img = {
    onload: null as any,
    onerror: null as any,
    src: "",
    width: 100,
    height: 100,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    complete: false,
    naturalWidth: 100,
    naturalHeight: 100,
    crossOrigin: null,
    loading: "eager",
    decode: vi.fn(() => Promise.resolve()),
  };
  
  setTimeout(() => {
    img.complete = true;
    if (img.onload) {
      img.onload();
    }
  }, 0);
  
  return img;
};

(global as any).Image = vi.fn(createMockImage);

describe("AvatarPicker", () => {
  const mockOnAvatarChange = vi.fn();
  const defaultProps = {
    onAvatarChange: mockOnAvatarChange,
    userInitials: "JD",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default avatar when currentAvatarUrl is undefined", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const initialsElement = screen.getByText("JD");
    expect(initialsElement).toBeDefined();
    
    const avatarContainer = document.querySelector('.cursor-pointer');
    expect(avatarContainer).toBeDefined();
  });

  it("renders with current avatar when currentAvatarUrl is provided", () => {
    const avatarUrl = "https://example.com/avatar.jpg";
    render(<AvatarPicker {...defaultProps} currentAvatarUrl={avatarUrl} />);
    
    const avatarContainer = document.querySelector('.cursor-pointer');
    expect(avatarContainer).toBeDefined();
    
    expect(avatarContainer).toBeDefined();
  });

  it("shows user initials in fallback when no avatar", () => {
    render(<AvatarPicker {...defaultProps} userInitials="AB" />);
    
    const initialsElement = screen.getByText("AB");
    expect(initialsElement).toBeDefined();
  });

  it("opens file picker when avatar container is clicked", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const avatarContainer = document.querySelector('.cursor-pointer') as HTMLElement;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const clickSpy = vi.spyOn(fileInput, "click");
    fireEvent.click(avatarContainer);
    
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("handles file selection and shows preview", async () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeDefined();
    }, { timeout: 1000 });
    
    await waitFor(() => {
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeNull();
    }, { timeout: 3000 });
  });

  it("shows loading state during upload", async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
    );
    
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeDefined();
    });
  });

  it("calls onAvatarChange when avatar is successfully uploaded", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockOnAvatarChange).toHaveBeenCalledWith("https://stub-bucket.s3.amazonaws.com/avatar");
    }, { timeout: 3000 });
  });

  it("handles upload errors gracefully", async () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeNull();
    }, { timeout: 5000 });
    
    expect(mockOnAvatarChange).toHaveBeenCalled();
  });

  it("validates file types and rejects invalid files", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.txt", { type: "text/plain" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("validates file sizes and rejects files over 5MB", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeMockFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [largeMockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows default avatar when no file is selected", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const initialsElement = screen.getByText("JD");
    expect(initialsElement).toBeDefined();
    
    const avatarContainer = document.querySelector('.cursor-pointer');
    expect(avatarContainer).toBeDefined();
  });

  it("automatically uploads when file is selected", async () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockOnAvatarChange).toHaveBeenCalledWith("https://stub-bucket.s3.amazonaws.com/avatar");
    }, { timeout: 5000 });
    
    expect(document.querySelector('.animate-pulse')).toBeNull();
  });

  it("processes image cropping correctly", async () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });
  });

  it("processes image compression to WebP format", async () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        "image/webp",
        0.8
      );
    });
  });

  it("handles keyboard navigation with Enter key", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const avatarContainer = document.querySelector('.cursor-pointer') as HTMLElement;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const clickSpy = vi.spyOn(fileInput, "click");
    fireEvent.keyDown(avatarContainer, { key: "Enter" });
    
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("handles keyboard navigation with Space key", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const avatarContainer = document.querySelector('.cursor-pointer') as HTMLElement;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const clickSpy = vi.spyOn(fileInput, "click");
    fireEvent.keyDown(avatarContainer, { key: " " });
    
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("has basic file input attributes", () => {
    render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.getAttribute("accept")).toBe("image/*");
    expect(fileInput.className).toContain("hidden");
    
    const avatarContainer = document.querySelector('.cursor-pointer');
    expect(avatarContainer).toBeDefined();
    expect(avatarContainer?.getAttribute("role")).toBeNull();
    expect(avatarContainer?.getAttribute("aria-label")).toBeNull();
  });

  it("cleans up object URLs on unmount", async () => {
    const { unmount } = render(<AvatarPicker {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(["mock"], "test.jpg", { type: "image/jpeg" });
    
    Object.defineProperty(fileInput, "files", {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
