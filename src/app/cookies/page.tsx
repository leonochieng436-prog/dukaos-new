import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | DukaOS",
  description:
    "Cookie policy for DukaOS, covering essential, preference, and analytics cookies in a Kenya-compliant SaaS environment.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:px-10">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          DukaOS
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          This Cookie Policy explains how DukaOS uses cookies and similar tracking
          technologies on our website and application. We use cookies to keep the
          service secure, remember user preferences, improve usability, and support
          business operations responsibly.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Draft for compliance review. Cookie wording should be reviewed by a
          licensed Kenyan legal or compliance professional before operational launch.
        </div>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section>
            <h2 className="text-lg font-semibold">1. What are cookies?</h2>
            <p className="mt-2 text-muted-foreground">
              Cookies are small text files stored on your device when you visit a
              website or application. They help websites remember login sessions,
              user preferences, and platform behavior.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Types of cookies we use</h2>
            <p className="mt-2 text-muted-foreground">
              We may use essential cookies to keep DukaOS functioning correctly,
              preference cookies to remember your settings, analytics cookies to
              understand usage patterns, and limited marketing or tracking cookies
              only where you have given appropriate consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Why we use cookies</h2>
            <p className="mt-2 text-muted-foreground">
              Cookies help us maintain secure logins, remember business settings,
              detect suspicious activity, improve performance, support support
              operations, and identify opportunities to improve product quality and
              user experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Third-party cookies</h2>
            <p className="mt-2 text-muted-foreground">
              Some cookies may be set by third-party service providers used for
              analytics, hosting, payment processing, or support tools. These
              providers are expected to process data safely and in accordance with
              their own privacy commitments and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Your choices</h2>
            <p className="mt-2 text-muted-foreground">
              You can accept, reject, or manage cookies through your browser settings.
              Disabling some cookies may limit specific features or affect the
              experience of the platform. We will request consent for non-essential
              cookies where required by law or best practice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Cookie retention</h2>
            <p className="mt-2 text-muted-foreground">
              Session cookies are removed when you close your browser. Persistent
              cookies may remain for a limited period to remember preferences and aid
              usability. We keep cookies only for as long as necessary for their
              purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Changes to this policy</h2>
            <p className="mt-2 text-muted-foreground">
              We may update this Cookie Policy from time to time to reflect product
              changes, service upgrades, or legal and regulatory developments. Any
              major update will be communicated through the application or website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about our cookie practices can be sent to the Privacy Team at
              privacy@dukaos.com, the legal team at legal@dukaos.com, or the Data
              Protection Officer (DPO) at dpo@dukaos.com.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
