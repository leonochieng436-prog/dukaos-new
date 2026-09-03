import { createHmac, timingSafeEqual } from "node:crypto";

export function hasValidMpesaSignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}

export function parseMpesaCallback(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const body = (payload as { Body?: unknown }).Body;
  if (!body || typeof body !== "object") return null;
  const callback = (body as { stkCallback?: unknown }).stkCallback;
  if (!callback || typeof callback !== "object") return null;
  const resultCode = (callback as { ResultCode?: unknown }).ResultCode;
  if (typeof resultCode !== "number" || !Number.isInteger(resultCode) || resultCode < 0) return null;
  return { resultCode };
}