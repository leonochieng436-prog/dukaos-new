import { NextResponse } from "next/server";
import { hasValidMpesaSignature, parseMpesaCallback } from "@/lib/mpesa-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!hasValidMpesaSignature(rawBody, request.headers.get("x-mpesa-signature"), process.env.MPESA_CALLBACK_SECRET)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 }); }
  const callback = parseMpesaCallback(payload);
  if (!callback) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback" }, { status: 400 });

  console.info("M-Pesa callback accepted", { resultCode: callback.resultCode });
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
