import { describe, expect, it } from "vitest";
import { matchesRegisterCredential } from "./register-credentials";

describe("register credential verification", () => {
  it("accepts the correct terminal code and password", async () => {
    const result = await matchesRegisterCredential(
      "POS-01",
      "Cashier@2025",
      "POS-01",
      "$2b$12$erdmkhvtfohqMtZsEjy.suEKBc6OVFQY1S1y30X79z5T08NGQ1yTC",
    );

    expect(result).toBe(true);
  });

  it("rejects an incorrect terminal code", async () => {
    const result = await matchesRegisterCredential(
      "POS-02",
      "Cashier@2025",
      "POS-01",
      "$2b$12$erdmkhvtfohqMtZsEjy.suEKBc6OVFQY1S1y30X79z5T08NGQ1yTC",
    );

    expect(result).toBe(false);
  });
});
