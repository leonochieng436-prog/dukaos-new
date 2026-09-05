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
  const resultDescription = (callback as { ResultDesc?: unknown }).ResultDesc;
  const checkoutRequestId = (callback as { CheckoutRequestID?: unknown }).CheckoutRequestID;
  const merchantRequestId = (callback as { MerchantRequestID?: unknown }).MerchantRequestID;
  const items = (callback as { CallbackMetadata?: { Item?: unknown } }).CallbackMetadata?.Item;
  const metadata = Array.isArray(items) ? items.filter((item): item is { Name: string; Value?: unknown } => typeof item === "object" && item !== null && typeof (item as { Name?: unknown }).Name === "string") : [];
  const result: { resultCode: number; resultDescription?: string; checkoutRequestId?: string; merchantRequestId?: string; receiptNumber?: string; amount?: string; phoneNumber?: string } = { resultCode };
  if (typeof resultDescription === "string") result.resultDescription = resultDescription;
  if (typeof checkoutRequestId === "string") result.checkoutRequestId = checkoutRequestId;
  if (typeof merchantRequestId === "string") result.merchantRequestId = merchantRequestId;
  const value = (name: string) => metadata.find((item) => item.Name === name)?.Value;
  if (typeof value("MpesaReceiptNumber") === "string") result.receiptNumber = value("MpesaReceiptNumber") as string;
  if (typeof value("Amount") === "number" || typeof value("Amount") === "string") result.amount = String(value("Amount"));
  if (typeof value("PhoneNumber") === "number" || typeof value("PhoneNumber") === "string") result.phoneNumber = String(value("PhoneNumber"));
  return result;
}