import Decimal from "decimal.js";

export const UNLIMITED_LIMIT = 999;

const SHARED_FEATURES = {
  pos: true,
  inventory: true,
  customers: true,
  reports: true,
  multiBranch: false,
  purchases: false,
  stockTransfers: false,
  creditSales: false,
  advancedReports: false,
  analytics: false,
  auditLogs: false,
  apiAccess: false,
} as const;

export const PLAN_CATALOG = {
  trial: { branchLimit: 1, registerLimit: 1, userLimit: 2, monthlyPrice: 0, stripePriceEnv: null, features: SHARED_FEATURES },
  starter: { branchLimit: 1, registerLimit: 1, userLimit: 2, monthlyPrice: 1200, stripePriceEnv: "STRIPE_STARTER_PRICE_ID", features: SHARED_FEATURES },
  growth: { branchLimit: 3, registerLimit: 3, userLimit: 8, monthlyPrice: 2500, stripePriceEnv: "STRIPE_GROWTH_PRICE_ID", features: { ...SHARED_FEATURES, multiBranch: true, purchases: true, stockTransfers: true, creditSales: true, advancedReports: true, analytics: true } },
  enterprise: { branchLimit: 10, registerLimit: 15, userLimit: 30, monthlyPrice: 5000, stripePriceEnv: "STRIPE_ENTERPRISE_PRICE_ID", features: { ...SHARED_FEATURES, multiBranch: true, purchases: true, stockTransfers: true, creditSales: true, advancedReports: true, analytics: true, auditLogs: true, apiAccess: true } },
} as const;

export type Plan = keyof typeof PLAN_CATALOG;
export type Feature = keyof typeof SHARED_FEATURES;
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

export function annualPrice(plan: Plan): number {
  return Math.round(PLAN_CATALOG[plan].monthlyPrice * 12 * 0.9);
}

export function decimalWithinLimit(current: Decimal.Value, limit: number): boolean {
  return new Decimal(current).lessThan(limit);
}
