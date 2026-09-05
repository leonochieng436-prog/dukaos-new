import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { planLimits, type Plan } from "@/lib/billing";
import { rawPrisma } from "@/server/db/client";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Missing Stripe signature configuration." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const organizationId = session.metadata?.organizationId ?? session.client_reference_id;
    const plan = session.metadata?.plan as Plan | undefined;
    if (!organizationId || !plan || !(plan in planLimits)) return NextResponse.json({ received: true });

    let currentPeriodEnd: Date | null = null;
    if (typeof session.subscription === "string") {
      const subscription = await getStripe().subscriptions.retrieve(session.subscription);
      currentPeriodEnd = subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000)
        : null;
    }
    const limits = planLimits(plan);
    await rawPrisma.subscription.update({
      where: { organizationId },
      data: { plan, status: "active", branchLimit: limits.branchLimit, userLimit: limits.userLimit, currentPeriodEnd },
    });
  }

  return NextResponse.json({ received: true });
}