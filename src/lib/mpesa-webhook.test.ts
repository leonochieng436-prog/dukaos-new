import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hasValidMpesaSignature, parseMpesaCallback } from "./mpesa-webhook";

describe("M-Pesa webhook boundary", () => {
  const body = JSON.stringify({ Body: { stkCallback: { ResultCode: 0 } } });
  const signature = createHmac("sha256", "test-secret").update(body).digest("hex");

  it("requires a valid signature", () => {
    expect(hasValidMpesaSignature(body, signature, "test-secret")).toBe(true);
    expect(hasValidMpesaSignature(body, signature.slice(0, -1), "test-secret")).toBe(false);
    expect(hasValidMpesaSignature(body, null, "test-secret")).toBe(false);
  });

  it("accepts only a structured STK callback", () => {
    expect(parseMpesaCallback(JSON.parse(body))).toEqual({ resultCode: 0 });
    expect(parseMpesaCallback({ Body: { stkCallback: { ResultCode: "0" } } })).toBeNull();
    expect(parseMpesaCallback({})).toBeNull();
  });
});