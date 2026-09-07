import { NextResponse } from "next/server";
import { sendEmail } from "@/server/services/messaging";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Email test endpoint is only available in development." }, { status: 404 });
  }

  try {
    const body = await request.json() as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const result = await sendEmail({
      recipient: email,
      subject: "DukaOS Email Test",
      message: "Your DukaOS email system is working correctly. This email was sent from your local development environment using Resend.",
      html: "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px\"><h1>DukaOS</h1><p>Your DukaOS email system is working correctly.</p><p>This email was sent from your local development environment using Resend.</p><hr><p style=\"color:#777\">DukaOS - Business Management System</p></div>",
    });

    return NextResponse.json({ success: true, messageId: result?.id ?? null });
  } catch (error) {
    console.error("EMAIL TEST ERROR:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to send email" }, { status: 500 });
  }
}