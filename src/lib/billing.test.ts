import { describe, expect, it } from "vitest";
import {
  checkLimit,
  computeEffectiveSubscriptionStatus,
  computeTrialDaysRemaining,
  isSubscriptionBlocking,
  annualPrice,
  PLAN_CATALOG,
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

  it("keeps published plan prices, limits, and annual discount centralized", () => {
    expect(PLAN_CATALOG.starter).toMatchObject({ branchLimit: 1, registerLimit: 1, userLimit: 2, monthlyPrice: 1200 });
    expect(PLAN_CATALOG.growth).toMatchObject({ branchLimit: 3, registerLimit: 3, userLimit: 8, monthlyPrice: 2500 });
    expect(PLAN_CATALOG.enterprise).toMatchObject({ branchLimit: 10, registerLimit: 15, userLimit: 30, monthlyPrice: 5000 });
    expect(annualPrice("starter")).toBe(12960);
    expect(annualPrice("growth")).toBe(27000);
    expect(annualPrice("enterprise")).toBe(54000);
  });
});
