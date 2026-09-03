import { redirect } from "next/navigation";
import { CheckCircle2, LogOut, MessageCircle, ShieldCheck } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { getCurrentSession } from "@/server/auth/session";
import { rawPrisma } from "@/server/db/client";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export default async function AccountPendingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.organizationId) redirect("/login");

  const [user, subscription] = await Promise.all([
    rawPrisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    rawPrisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
  ]);

  if (subscription?.status === "active" || subscription?.status === "trialing") {
    redirect("/dashboard");
  }

  const planName = PLAN_NAMES[subscription?.plan ?? "starter"] ?? "Selected";
  const whatsappMessage = encodeURIComponent(
    `Hello DukaOS, I have registered ${user.email} for the ${planName} package. Please send payment instructions or confirm my payment so the account can be activated.`,
  );
  const whatsappUrl = `https://wa.me/254757308631?text=${whatsappMessage}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f7] px-5 py-12 text-foreground sm:px-8">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-bold text-white">D</span>
          <span className="text-lg font-bold tracking-[0.16em]">DUKA<span className="text-primary">OS</span></span>
        </div>
        <section className="rounded-xl border border-border bg-white p-6 shadow-[0_18px_45px_rgba(18,57,51,0.08)] sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-tint text-warning">
            <CheckCircle2 size={25} />
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Registration received</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your workspace is waiting for confirmation.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            We have reserved your DukaOS account on the <strong className="text-foreground">{planName}</strong> package. Complete payment, then send the details to our team. Your dashboard will open after we confirm it.
          </p>
          <div className="mt-8 space-y-3 rounded-lg border border-border bg-[#f8faf9] p-5">
            <div className="flex items-start gap-3"><MessageCircle className="mt-0.5 shrink-0 text-primary" size={19} /><p className="text-sm leading-6"><strong>WhatsApp DukaOS</strong><br /><span className="text-muted-foreground">+254 757 308 631</span></p></div>
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={19} /><p className="text-sm leading-6"><strong>Activation after confirmation</strong><br /><span className="text-muted-foreground">Your account remains locked until payment is confirmed.</span></p></div>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"><MessageCircle size={17} /> WhatsApp payment confirmation</a>
            <form action={logout}><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary"><LogOut size={16} /> Log out</button></form>
          </div>
          <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Already sent payment? Include your business name, selected package, and payment reference in WhatsApp so we can match your account quickly.</p>
        </section>
      </div>
    </main>
  );
}
