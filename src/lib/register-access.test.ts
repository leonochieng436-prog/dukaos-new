import { describe, expect, it } from "vitest";
import { ensureRegisterBelongsToOrg, registerSessionMatchesUser } from "./register-access";

describe("register access guard", () => {
  it("accepts a matching organization, branch, register and active user session", () => {
    const session = {
      organizationId: "org-1",
      branchId: "branch-1",
      registerId: "register-1",
      userId: "user-1",
      status: "OPEN",
    };

    expect(registerSessionMatchesUser({
      organizationId: "org-1",
      branchId: "branch-1",
      registerId: "register-1",
      userId: "user-1",
    }, session)).toBe(true);
  });

  it("rejects cross-organization register access", () => {
    expect(() => ensureRegisterBelongsToOrg({
      organizationId: "org-1",
      branchId: "branch-1",
      registerId: "register-1",
    }, {
      organizationId: "org-2",
      branchId: "branch-1",
      registerId: "register-1",
    })).toThrow("Register does not belong to this organization");
  });
});
