"use server";

import { z } from "zod";
import { sendEmail } from "@/server/services/messaging";
import { brandedEmail } from "@/server/services/messaging";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  businessName: z.string().trim().min(2, "Please enter your business name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().min(7, "Please enter a valid phone number."),
  businessType: z.string().trim().max(100).optional().or(z.literal("")),
  numberOfLocations: z.string().trim().max(40).optional().or(z.literal("")),
  currentSystem: z.string().trim().max(200).optional().or(z.literal("")),
  interest: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please share a few more details about your needs."),
});

function resolveContactRecipient(): string {
  const explicitRecipient = process.env.CONTACT_TO_EMAIL?.trim();
  if (explicitRecipient) return explicitRecipient;

  const envFrom = process.env.EMAIL_FROM?.trim();
  if (envFrom) {
    const match = envFrom.match(/<([^>]+)>/);
    if (match?.[1]?.trim()) return match[1].trim();
    const bareEmail = envFrom.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    if (bareEmail) return bareEmail;
  }

  return "leonochieng436@gmail.com";
}

export async function submitContactEnquiry(raw: unknown) {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please fix the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;

  try {
    const body = `
      Full name: ${input.fullName}
      Business name: ${input.businessName}
      Email: ${input.email}
      Phone: ${input.phone}
      Business type: ${input.businessType || "Not specified"}
      Number of locations: ${input.numberOfLocations || "Not specified"}
      Current POS / business system: ${input.currentSystem || "Not specified"}
      Interest: ${input.interest || "Not specified"}

      Message:
      ${input.message}
    `;

    const to = resolveContactRecipient();

    await sendEmail({
      recipient: to,
      subject: `New DukaOS enquiry from ${input.businessName}`,
      message: body,
      html: brandedEmail({
        preheader: `New enquiry from ${input.fullName}`,
        eyebrow: "New enquiry",
        title: "A new business enquiry has arrived",
        body: `
          <p><strong>Name:</strong> ${input.fullName}</p>
          <p><strong>Business:</strong> ${input.businessName}</p>
          <p><strong>Email:</strong> ${input.email}</p>
          <p><strong>Phone:</strong> ${input.phone}</p>
          <p><strong>Business type:</strong> ${input.businessType || "Not specified"}</p>
          <p><strong>Locations:</strong> ${input.numberOfLocations || "Not specified"}</p>
          <p><strong>Current system:</strong> ${input.currentSystem || "Not specified"}</p>
          <p><strong>Interest:</strong> ${input.interest || "Not specified"}</p>
          <p><strong>Message:</strong></p>
          <p>${input.message.replace(/\n/g, "<br>")}</p>
        `,
        cta: {
          label: "Open DukaOS",
          url: process.env.NEXT_PUBLIC_APP_URL ?? "https://dukaos.com",
        },
      }),
      replyTo: input.email,
    });

    return { ok: true as const, message: "Thanks for contacting DukaOS. We’ve received your enquiry and will get back to you." };
  } catch (error) {
    console.error("CONTACT_ENQUIRY_ERROR", error);
    return {
      ok: false as const,
      error: "We couldn't send your enquiry right now. Please try again in a few minutes or contact us through a different channel.",
    };
  }
}
