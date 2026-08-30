import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("./session", () => ({
  getCurrentSession: vi.fn(),
}));

import { requireAuthContext } from "./context";
import { getCurrentSession } from "./session";

describe("requireAuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to the login page", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
