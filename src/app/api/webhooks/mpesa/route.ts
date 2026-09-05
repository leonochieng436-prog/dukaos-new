import { NextResponse } from "next/server";
import { hasValidMpesaSignature, parseMpesaCallback } from "@/lib/mpesa-webhook";
import { rawPrisma } from "@/server/db/client";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!hasValidMpesaSignature(rawBody, request.headers.get("x-mpesa-signature"), process.env.MPESA_CALLBACK_SECRET)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 }); }
  const callback = parseMpesaCallback(payload);
  if (!callback) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback" }, { status: 400 });

  if (callback.checkoutRequestId) {
    const intent = await rawPrisma.mpesaPaymentIntent.findUnique({ where: { checkoutRequestId: callback.checkoutRequestId } });
    if (intent && intent.status !== "COMPLETED" && intent.status !== "FAILED") {
      const succeeded = callback.resultCode === 0;
      await rawPrisma.mpesaPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: succeeded ? "COMPLETED" : "FAILED",
          resultCode: callback.resultCode,
          resultDescription: callback.resultDescription ?? null,
          merchantRequestId: callback.merchantRequestId ?? intent.merchantRequestId,
          mpesaReceiptNumber: callback.receiptNumber ?? null,
          completedAt: new Date(),
          metadata: callback,
        },
      });
    }
  }
  console.info("M-Pesa callback accepted", { resultCode: callback.resultCode, checkoutRequestId: callback.checkoutRequestId });
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
