import "server-only";
import { checkLimit, computeEffectiveSubscriptionStatus, isSubscriptionBlocking, PLAN_CATALOG, type Feature, type Plan } from "@/lib/billing";
import { AuthError, type AuthContext } from "@/server/auth/context";

export async function getEntitlements(ctx: AuthContext) {
  const subscription = await ctx.db.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!subscription) throw new AuthError("No subscription is configured for this organization.", 403);
  const status = computeEffectiveSubscriptionStatus(subscription);
  if (isSubscriptionBlocking(status)) {
    throw new AuthError("Your subscription is not active. Please renew your plan to continue.", 403);
  }
  const plan = (PLAN_CATALOG[subscription.plan as Plan] ?? PLAN_CATALOG.trial);
  return { plan: subscription.plan as Plan, status, limits: { branchLimit: subscription.branchLimit, registerLimit: subscription.registerLimit, userLimit: subscription.userLimit }, features: plan.features };
}

export async function assertSubscriptionActive(ctx: AuthContext): Promise<void> {
  await getEntitlements(ctx);
}

export async function assertFeature(ctx: AuthContext, feature: Feature): Promise<void> {
  const entitlements = await getEntitlements(ctx);
  if (!entitlements.features[feature]) {
    throw new AuthError(`This feature is available on the Growth plan and above. Upgrade your plan to use ${feature}.`, 403);
  }
}

export async function assertBranchLimitNotExceeded(ctx: AuthContext): Promise<void> {
  const subscription = await ctx.db.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!subscription) throw new AuthError("No subscription is configured for this organization.", 403);
  const current = await ctx.db.branch.count({ where: { isActive: true } });
  checkLimit(current, subscription.branchLimit, { singular: "branch", plural: "branches" });
}

export async function assertUserLimitNotExceeded(ctx: AuthContext): Promise<void> {
  const subscription = await ctx.db.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!subscription) throw new AuthError("No subscription is configured for this organization.", 403);
  const current = await ctx.db.userOrganization.count({ where: { isActive: true } });
  checkLimit(current, subscription.userLimit, { singular: "user", plural: "users" });
}

export async function assertRegisterLimitNotExceeded(ctx: AuthContext): Promise<void> {
  const subscription = await ctx.db.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!subscription) throw new AuthError("No subscription is configured for this organization.", 403);
  const current = await ctx.db.register.count({ where: { isActive: true } });
  checkLimit(current, subscription.registerLimit, { singular: "register", plural: "registers" });
}
