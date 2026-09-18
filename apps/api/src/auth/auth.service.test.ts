import { describe, expect, it, vi } from "vitest";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

function prismaMock(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "u1",
        email: data.email,
        passwordHash: data.passwordHash,
        disabled: false,
      })),
    },
    plan: {
      findUnique: vi.fn().mockResolvedValue({ id: "trial" }),
    },
    ...overrides,
  };
}

describe("AuthService", () => {
  const jwt = { sign: vi.fn().mockReturnValue("tok") } as unknown as JwtService;

  it("registers and returns token without password", async () => {
    const prisma = prismaMock();
    const svc = new AuthService(prisma as never, jwt);
    const out = await svc.register({ email: "a@b.com", password: "password1" });
    expect(out.token).toBe("tok");
    expect(out.user.email).toBe("a@b.com");
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("rejects duplicate email", async () => {
    const prisma = prismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: "x" });
    const svc = new AuthService(prisma as never, jwt);
    await expect(svc.register({ email: "a@b.com", password: "password1" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejects bad login", async () => {
    const prisma = prismaMock();
    const svc = new AuthService(prisma as never, jwt);
    await expect(svc.login({ email: "a@b.com", password: "password1" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
