import type { Metadata } from "next";
import { ContactPageContent } from "@/components/marketing/contact-page";

export const metadata: Metadata = {
  title: "Contact DukaOS | POS & Business Management Software Kenya",
  description:
    "Contact DukaOS for POS software, inventory management, business management solutions, demos, onboarding and support for businesses in Kenya.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}
