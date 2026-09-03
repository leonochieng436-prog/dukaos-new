import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { MarketingLandingPage } from "@/components/marketing-landing-page";

export default async function RootPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <MarketingLandingPage />;
}
