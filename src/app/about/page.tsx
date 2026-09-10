import type { Metadata } from "next";
import { AboutPageContent } from "@/components/marketing/about-page";

export const metadata: Metadata = {
  title: "About DukaOS | Business Management & POS Software in Kenya",
  description:
    "Learn how DukaOS helps Kenyan businesses manage sales, inventory, purchases, customers, suppliers, branches and reports from one powerful business management system.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
