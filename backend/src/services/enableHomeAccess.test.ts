import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {
        return prismaMock;
      }
    },
  };
});

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedpassword"),
  },
}));

import { enableHomeAccess } from "./enableHomeAccess";

describe("enableHomeAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enable home access for a class-code-only student", async () => {
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      role: "student",
      loginIcon: "🐱",
      email: null,
      homeAccessEnabled: false,
    });
    // @ts-ignore
    prismaMock.user.findFirst.mockResolvedValue(null); // no email collision
    // @ts-ignore
    prismaMock.user.update.mockResolvedValue({
      id: "student-1",
      email: "parent@example.com",
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: null,
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });

    const result = await enableHomeAccess("student-1", {
      email: "parent@example.com",
      password: "Secure123",
    });

    expect(result.homeAccessEnabled).toBe(true);
    expect(result.accountMode).toBe("CLASS_CODE_PLUS_HOME_ACCESS");
    expect(result.email).toBe("parent@example.com");

    // @ts-ignore
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
        data: expect.objectContaining({
          email: "parent@example.com",
          homeAccessEnabled: true,
          accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
        }),
      }),
    );
  });

  it("should reject duplicate email", async () => {
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      role: "student",
      loginIcon: "🐱",
      email: null,
      homeAccessEnabled: false,
    });
    // @ts-ignore
    prismaMock.user.findFirst.mockResolvedValue({ id: "other-user" }); // email taken

    await expect(
      enableHomeAccess("student-1", {
        email: "taken@example.com",
        password: "Secure123",
      }),
    ).rejects.toThrow("Email already in use");
  });

  it("should reject if user is not a student", async () => {
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      id: "teacher-1",
      role: "teacher",
      loginIcon: null,
      email: "teacher@test.com",
      homeAccessEnabled: false,
    });

    await expect(
      enableHomeAccess("teacher-1", {
        email: "parent@example.com",
        password: "Secure123",
      }),
    ).rejects.toThrow("Student not found");
  });

  it("should set EMAIL_ONLY when student has no loginIcon", async () => {
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-2",
      role: "student",
      loginIcon: null,
      email: null,
      homeAccessEnabled: false,
    });
    // @ts-ignore
    prismaMock.user.findFirst.mockResolvedValue(null);
    // @ts-ignore
    prismaMock.user.update.mockResolvedValue({
      id: "student-2",
      email: "home@example.com",
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: null,
      accountMode: "EMAIL_ONLY",
    });

    const result = await enableHomeAccess("student-2", {
      email: "home@example.com",
      password: "Secure123",
    });

    expect(result.accountMode).toBe("EMAIL_ONLY");
  });
});
