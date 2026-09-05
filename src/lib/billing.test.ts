import { describe, expect, it } from "vitest";
import {
  checkLimit,
  computeEffectiveSubscriptionStatus,
  computeTrialDaysRemaining,
  isSubscriptionBlocking,
} from "@/lib/billing";

const now = new Date("2026-09-05T12:00:00.000Z");

describe("subscription billing rules", () => {
  it("derives an expired trial from the current clock", () => {
    expect(computeEffectiveSubscriptionStatus({ status: "trialing", trialEndsAt: new Date("2026-09-05T11:59:59.000Z") }, now)).toBe("trial_expired");
    expect(computeEffectiveSubscriptionStatus({ status: "trialing", trialEndsAt: new Date("2026-09-06T00:00:00.000Z") }, now)).toBe("trialing");
  });

  it("blocks only expired trials and canceled subscriptions", () => {
    expect(isSubscriptionBlocking("trial_expired")).toBe(true);
    expect(isSubscriptionBlocking("canceled")).toBe(true);
    expect(isSubscriptionBlocking("past_due")).toBe(false);
  });

  it("floors trial days and never returns a negative number", () => {
    expect(computeTrialDaysRemaining(new Date("2026-09-06T23:59:00.000Z"), now)).toBe(1);
    expect(computeTrialDaysRemaining(new Date("2026-09-04T00:00:00.000Z"), now)).toBe(0);
  });

  it("uses explicit plural nouns in limit errors", () => {
    expect(() => checkLimit(1, 1, { singular: "branch", plural: "branches" })).toThrow("1 branch");
    expect(() => checkLimit(5, 5, { singular: "user", plural: "users" })).toThrow("5 users");
  });
});
