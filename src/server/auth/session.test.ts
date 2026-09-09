import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, rawPrismaMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  rawPrismaMock: {
    session: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    userOrganization: { findUnique: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/server/db/client", () => ({
  rawPrisma: rawPrismaMock,
}));

import { getCurrentSession } from "./session";

describe("getCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the session organization is no longer active or the user lost membership", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token-123" }),
    });

    rawPrismaMock.session.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      organizationId: "org-1",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(Date.now() - 60_000),
      user: { isActive: true },
    });
    rawPrismaMock.organization.findUnique.mockResolvedValue({
      isActive: false,
      timezone: "UTC",
    });
    rawPrismaMock.userOrganization.findUnique.mockResolvedValue(null);

    await expect(getCurrentSession()).resolves.toBeNull();
    expect(rawPrismaMock.userOrganization.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: "user-1",
          organizationId: "org-1",
        },
      },
      select: { isActive: true },
    });
  });
});
