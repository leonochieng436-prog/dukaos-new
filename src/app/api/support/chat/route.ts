import { NextResponse } from "next/server";
import { answerSupportQuestion, getSupportAssistantContext } from "@/server/services/support-assistant";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Enter a question." }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: "Keep the question under 2,000 characters." }, { status: 400 });

    const context = await getSupportAssistantContext();
    const answer = await answerSupportQuestion(message, context);
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Support assistant request failed", error);
    return NextResponse.json({ error: "The support assistant is temporarily unavailable." }, { status: 500 });
  }
}
