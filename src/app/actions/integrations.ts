"use server";

import { requireAuthContext, assertPermission, AuthError } from "@/server/auth/context";
import { recordAudit } from "@/server/services/audit";
import { sendMessage } from "@/server/services/messaging";
import type { ActionResult } from "./auth";

export async function sendNotification(raw: unknown): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requireAuthContext(); assertPermission(ctx, "SETTINGS_MANAGE");
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid notification request." };
    const input = raw as { channel?: string; recipient?: string; message?: string; subject?: string };
    if (!input.channel || !input.recipient || !input.message) return { ok: false, error: "Channel, recipient, and message are required." };
    if (input.channel !== "email" && input.channel !== "sms" && input.channel !== "whatsapp") return { ok: false, error: "Unsupported notification channel." };
    await sendMessage({ channel: input.channel, recipient: input.recipient, message: input.message, subject: input.subject });
    await recordAudit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "NOTIFICATION_REQUESTED", entityType: "Integration", metadata: { channel: input.channel, recipient: input.recipient } });
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    throw e;
  }
}
