import "server-only";
import { requireAuthContext } from "@/server/auth/context";

export type SupportAssistantContext = {
  organizationName: string;
  activeBranches: number;
  activeProducts: number;
  lowStockItems: number;
  recentMovementTypes: string[];
  permissions: string[];
};

export async function getSupportAssistantContext(): Promise<SupportAssistantContext> {
  const ctx = await requireAuthContext();
  const [organization, activeBranches, products, movements] = await Promise.all([
    ctx.db.organization.findUnique({ where: { id: ctx.organizationId }, select: { name: true } }),
    ctx.db.branch.count({ where: { isActive: true } }),
    ctx.db.product.findMany({
      where: { isActive: true },
      select: { variants: { select: { reorderLevel: true, inventoryItems: { select: { quantity: true } } } } },
    }),
    ctx.db.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { type: true },
    }),
  ]);

  const lowStockItems = products.reduce((count, product) => count + product.variants.filter((variant) => {
    const quantity = variant.inventoryItems.reduce((total, item) => total + Number(item.quantity), 0);
    return quantity <= Number(variant.reorderLevel);
  }).length, 0);

  return {
    organizationName: organization?.name ?? "your business",
    activeBranches,
    activeProducts: products.length,
    lowStockItems,
    recentMovementTypes: movements.map((movement) => movement.type),
    permissions: [...ctx.permissions],
  };
}

const LOCAL_ANSWERS: Array<{ matches: string[]; answer: string }> = [
  {
    matches: ["sale", "pos", "sell"],
    answer: "To complete a sale, open a cash session first, choose the branch and register, add products, then select a payment method. Stock is reduced automatically using FIFO costing. If the sale will be paid later, select a customer and use Credit.",
  },
  {
    matches: ["stock", "inventory", "quantity"],
    answer: "Inventory is tracked per warehouse and product variant. Use Inventory > Stock adjustment for a correction, or receive a purchase to add stock at its purchase cost. The movement history records each change.",
  },
  {
    matches: ["purchase", "receive", "supplier"],
    answer: "Create a purchase or purchase order, then receive the quantities delivered. Partial receipts are supported, and received stock is added to the selected warehouse at the purchase order cost.",
  },
  {
    matches: ["transfer", "warehouse", "branch"],
    answer: "A stock transfer ships immediately from the source warehouse and becomes In Transit. The destination user can receive it once it arrives; the receiving stock keeps the weighted cost reconstructed from the shipment ledger.",
  },
  {
    matches: ["billing", "plan", "subscription", "payment"],
    answer: "Open Billing from the administration menu to review your plan and limits. Paid plan changes start through secure checkout. A trial expires based on the current date, so no manual status refresh is needed.",
  },
  {
    matches: ["credit", "customer owe", "debt"],
    answer: "Credit sales require a customer. Open Credit or Customers to review outstanding balances and record a settlement against the customer or sale.",
  },
];

export function getLocalSupportAnswer(message: string, context: SupportAssistantContext): string {
  const normalized = message.toLowerCase();
  const match = LOCAL_ANSWERS.find((entry) => entry.matches.some((word) => normalized.includes(word)));
  if (match) return match.answer;
  return `I can help with POS sales, inventory, purchases, transfers, credit, reports, users, and billing. ${context.organizationName} currently has ${context.activeBranches} active branch${context.activeBranches === 1 ? "" : "es"}, ${context.activeProducts} active product${context.activeProducts === 1 ? "" : "s"}, and ${context.lowStockItems} item${context.lowStockItems === 1 ? "" : "s"} at or below reorder level. Tell me what you are trying to do or what error you see, and include the exact message if there is one.`;
}

export async function answerSupportQuestion(message: string, context: SupportAssistantContext): Promise<string> {
  const apiKey = process.env.SUPPORT_AI_API_KEY;
  const endpoint = process.env.SUPPORT_AI_API_URL;
  if (!apiKey || !endpoint) return getLocalSupportAnswer(message, context);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.SUPPORT_AI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are DukaOS Support, a concise and practical assistant for a Kenyan retail POS. Help users operate the app and troubleshoot errors. Never invent database changes, never ask for passwords, API keys, payment secrets, or full customer personal data. Do not claim to have performed an action. Give numbered steps when useful. If the issue needs an admin or developer, say exactly what evidence to provide. Organization context: ${JSON.stringify(context)}.`,
        },
        { role: "user", content: message.trim() },
      ],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return getLocalSupportAnswer(message, context);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() || getLocalSupportAnswer(message, context);
}
