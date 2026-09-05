import Decimal from "decimal.js";

export const UNLIMITED_LIMIT = 999;

export const PLAN_CATALOG = {
  trial: { branchLimit: 1, userLimit: 5, monthlyPrice: 0, stripePriceEnv: null },
  starter: { branchLimit: 1, userLimit: 5, monthlyPrice: 1500, stripePriceEnv: "STRIPE_STARTER_PRICE_ID" },
  growth: { branchLimit: 5, userLimit: 25, monthlyPrice: 3500, stripePriceEnv: "STRIPE_GROWTH_PRICE_ID" },
  enterprise: { branchLimit: UNLIMITED_LIMIT, userLimit: UNLIMITED_LIMIT, monthlyPrice: 7500, stripePriceEnv: "STRIPE_ENTERPRISE_PRICE_ID" },
} as const;

export type Plan = keyof typeof PLAN_CATALOG;
export type StoredSubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | string;
export type EffectiveSubscriptionStatus = StoredSubscriptionStatus | "trial_expired";

export function computeEffectiveSubscriptionStatus(
  subscription: { status: StoredSubscriptionStatus; trialEndsAt: Date | null },
  now = new Date()
): EffectiveSubscriptionStatus {
  if (subscription.status === "trialing" && subscription.trialEndsAt && subscription.trialEndsAt.getTime() <= now.getTime()) {
    return "trial_expired";
  }
  return subscription.status;
}

export function isSubscriptionBlocking(status: EffectiveSubscriptionStatus): boolean {
  return status === "trial_expired" || status === "canceled";
}

export function computeTrialDaysRemaining(trialEndsAt: Date | null, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.floor((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
}

export function checkLimit(current: number, limit: number, noun: { singular: string; plural: string }): void {
  if (current >= limit) {
    throw new Error(`Your plan allows ${limit} ${limit === 1 ? noun.singular : noun.plural}. Upgrade your plan to add another.`);
  }
}

export function getStripePriceId(plan: Plan): string | null {
  const envName = PLAN_CATALOG[plan].stripePriceEnv;
  return envName ? process.env[envName] ?? null : null;
}

export function planLimits(plan: Plan) {
  return PLAN_CATALOG[plan];
}

export function decimalWithinLimit(current: Decimal.Value, limit: number): boolean {
  return new Decimal(current).lessThan(limit);
}
