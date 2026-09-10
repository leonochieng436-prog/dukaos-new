"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCookieConsent, type CookieConsentPreferences } from "@/lib/cookie-consent";

export type LegalTab = "privacy" | "terms" | "cookies";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export function LegalModal({
  open,
  tab,
  onTabChange,
  onClose,
}: {
  open: boolean;
  tab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const tabs: { key: LegalTab; label: string }[] = [
    { key: "privacy", label: "Privacy Policy" },
    { key: "terms", label: "Terms & Conditions" },
    { key: "cookies", label: "Cookie Policy" },
  ];

  const contents: Record<LegalTab, React.ReactNode> = {
    privacy: (
      <div className="space-y-5">
        <Section title="1. Purpose">
          <p>
            DukaOS (“we”, “our”, “us”) is a business operations platform for sales,
            inventory, purchases, customers, payments, and reporting. This Privacy
            Policy explains how we collect, process, store, transfer, and protect
            personal data in Kenya and elsewhere in accordance with the Kenya Data
            Protection Act, 2019, the Constitution of Kenya, and applicable
            commercial and IT security requirements.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>
            We may collect names, phone numbers, email addresses, business name,
            physical address, ID or registration information, account credentials,
            transaction data, payment references, supplier data, device metadata,
            IP addresses, and cookie information. Where legally required, we may
            also collect additional information for onboarding, KYC, or statutory
            reporting.
          </p>
        </Section>

        <Section title="3. How we use information">
          <p>
            We process personal data to provide our services, operate the platform,
            verify user identities, maintain business records, support customer
            service, manage invoices, support payments, detect fraud, protect
            system integrity, and comply with legal obligations. We do not sell
            personal data to third parties for marketing purposes.
          </p>
        </Section>

        <Section title="4. Lawful basis and consent">
          <p>
            We rely on the lawful basis applicable to each processing activity,
            including contract performance, legitimate business interests, legal
            obligations, and where required, your explicit consent. For direct
            marketing messages, we will obtain appropriate consent and provide an
            easy opt-out option.
          </p>
        </Section>

        <Section title="5. Data security and IT controls">
          <p>
            We implement reasonable technical and organisational safeguards,
            including access controls, role-based permissions, encrypted
            transmissions, secure data storage, periodic security reviews, staff
            confidentiality obligations, and logging for event monitoring. However,
            no internet-connected system is perfectly secure; we continuously work
            to reduce risks and notify affected parties where legally required.
          </p>
        </Section>

        <Section title="6. Retention">
          <p>
            We retain personal data only for as long as necessary to provide the
            service, meet contractual and legal obligations, support accounting,
            audit, and tax requirements, resolve disputes, and protect the platform
            from misuse. When data is no longer required, we securely delete or
            anonymise it.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            In line with the Kenya Data Protection Act, individuals may request
            access to their personal data, correction of inaccurate information,
            deletion where appropriate, restriction or objection to certain
            processing, and data portability where applicable. To exercise these
            rights, contact us through the channels listed in this policy.
          </p>
        </Section>

        <Section title="8. Third-party processors">
          <p>
            We may use trusted service providers for hosting, payments, email,
            analytics, customer support, or business infrastructure. These parties
            are expected to process personal data only on our instructions and in a
            manner consistent with applicable law.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            If you have privacy questions, concerns, or requests, contact the
            DukaOS Privacy Team at privacy@dukaos.com, the legal team at
            legal@dukaos.com, or the Data Protection Officer at dpo@dukaos.com.
            You may also use the support channels available in the application.
            We will review requests in line with applicable legal and operational
            requirements.
          </p>
        </Section>
      </div>
    ),
    terms: (
      <div className="space-y-5">
        <Section title="1. Acceptance of terms">
          <p>
            By accessing or using DukaOS, you agree to these Terms and Conditions.
            If you do not agree, you must not use the service. We may update these
            terms from time to time, and continued use after updates indicates
            acceptance.
          </p>
        </Section>

        <Section title="2. Service description">
          <p>
            DukaOS provides a web-based platform for businesses to manage sales,
            inventory, purchases, customers, suppliers, payments, working capital,
            user access, and reporting. Features may vary by subscription plan,
            configuration, and integrations available at a given time.
          </p>
        </Section>

        <Section title="3. User responsibilities">
          <p>
            You are responsible for the accuracy of the data you upload or enter,
            the security of your account credentials, compliance with your internal
            approval processes, and lawful use of the platform. You must not use
            DukaOS for fraudulent activity, illegal trade, money laundering,
            cybercrime, or any activity that violates Kenyan law or the rights of
            others.
          </p>
        </Section>

        <Section title="4. Fees and payments">
          <p>
            Subscription fees, setup charges, or optional add-ons are billed as
            described in the order or pricing page. We may suspend or restrict
            access for overdue charges, subject to reasonable notice and
            applicable recovery procedures. Taxes, where applicable, are your
            responsibility unless expressly stated otherwise.
          </p>
        </Section>

        <Section title="5. Service availability and support">
          <p>
            We aim to provide a reliable service but do not guarantee uninterrupted
            access. Scheduled maintenance, service interruptions, third-party outages,
            or force majeure events may affect availability. We will provide support
            through help channels available on the platform, but support response
            times may vary.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            DukaOS, its software, branding, content, and related materials remain
            the property of DukaOS or its licensors. You may use the platform only
            in accordance with your subscription and these terms. You retain rights
            to your business data, but by using the service you authorise us to
            process it as required to operate and maintain the platform.
          </p>
        </Section>

        <Section title="7. Liability and limitation">
          <p>
            DukaOS is provided “as is” and “as available.” We do not exclude
            liability for fraud, intentional misconduct, or obligations imposed by
            mandatory law. To the maximum extent permitted by law, we shall not be
            liable for indirect, incidental, consequential, special, or punitive
            damages arising from use of the service, except where required by law.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            We may suspend or terminate access if you breach these terms, fail to
            pay due amounts, abuse the service, or create material security or
            compliance risk. On termination, your access to the service will cease,
            and we may delete account data in line with our retention and legal
            obligations.
          </p>
        </Section>

        <Section title="9. Compliance with Kenyan laws">
          <p>
            Use of DukaOS must comply with Kenyan law, including data protection,
            consumer protection, tax, financial service, and cybercrime
            obligations. Where your use involves regulated activities, you remain
            solely responsible for obtaining any required licences, approvals, or
            consents.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these terms should be directed to the legal team at
            legal@dukaos.com, the Privacy Team at privacy@dukaos.com, or the Data
            Protection Officer at dpo@dukaos.com. If you need support from the
            application team, use the support channels available in the platform.
          </p>
        </Section>
      </div>
    ),
    cookies: (
      <div className="space-y-5">
        <Section title="1. What are cookies?">
          <p>
            Cookies are small text files stored on your browser or device when you
            visit a website. They help websites function correctly, remember your
            preferences, and understand how users interact with the service.
          </p>
        </Section>

        <Section title="2. Types of cookies we use">
          <p>
            We may use essential cookies to keep the platform secure and functional,
            preference cookies to remember settings, analytics cookies to improve
            performance, and limited marketing cookies where you have consented.
          </p>
        </Section>

        <Section title="3. Purpose of cookies">
          <p>
            Cookies help us maintain login sessions, remember business settings,
            detect suspicious activity, improve product reliability, understand user
            flows, and measure the effectiveness of product improvements.
          </p>
        </Section>

        <Section title="4. Your choices">
          <p>
            You may accept all cookies, reject non-essential cookies, or adjust
            your browser settings to block or delete cookies. Please note that
            disabling some cookies may affect service performance or limit certain
            features.
          </p>
        </Section>

        <Section title="5. Third-party cookies">
          <p>
            Some cookies may be placed by third-party services used for analytics,
            payments, support, or hosting. These providers are bound by their own
            policies and relevant data protection obligations.
          </p>
        </Section>

        <Section title="6. Cookie retention">
          <p>
            We keep cookies only for the period necessary for their purpose. Session
            cookies are deleted when you close your browser, while persistent cookies
            may remain for a limited time to remember preferences and improve user
            experience.
          </p>
        </Section>

        <Section title="7. Consent and updates">
          <p>
            Where required by law or best practice, we will request consent before
            placing non-essential cookies. You may manage your preferences through
            the cookie preference manager in the application or via our support
            channels. This Cookie Policy may be updated periodically to reflect
            product changes or regulatory guidance.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            For cookie, privacy, or data protection questions, contact the Privacy
            Team at privacy@dukaos.com, the legal team at legal@dukaos.com, or the
            Data Protection Officer at dpo@dukaos.com.
          </p>
        </Section>
      </div>
    ),
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Legal policy"
        className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-[0_28px_80px_rgba(12,24,23,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-border bg-[#f5faf8] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Legal information
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {tabs.find((item) => item.key === tab)?.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal policy"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        <div className="border-b border-border bg-white px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  tab === item.key
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-5 sm:px-6">
          {contents[tab]}
        </div>
      </div>
    </div>
  );
}

function CookiePreferencesModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (preferences: { essential: boolean; preferences: boolean; analytics: boolean; marketing: boolean }) => void;
}) {
  const savedConsent = getCookieConsent();
  const [preferences, setPreferences] = useState(savedConsent?.preferences ?? false);
  const [analytics, setAnalytics] = useState(savedConsent?.analytics ?? false);
  const [marketing, setMarketing] = useState(savedConsent?.marketing ?? false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-[0_28px_80px_rgba(12,24,23,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-border bg-[#f5faf8] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Cookie preferences
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Manage your cookie preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cookie preferences"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Manage which types of cookies you allow DukaOS to use. Essential cookies cannot be disabled because they are necessary for the website to function.
          </p>

          <div className="rounded-xl border border-border bg-[#f9fbfa] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Essential cookies</p>
                <p className="text-xs text-muted-foreground">
                  Required for secure access, sessions, authentication and core platform functionality.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                Always active
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Preference cookies</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Remember choices such as language or region to provide a more personalised experience.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences}
              onChange={(event) => setPreferences(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Analytics cookies</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Help us understand how visitors use DukaOS so we can improve performance, content and user experience.
              </p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Marketing cookies</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Used to measure campaign performance and understand interactions with marketing content where relevant.
              </p>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSave({ essential: true, preferences: false, analytics: false, marketing: false })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              Save preferences
            </button>
            <button
              type="button"
              onClick={() => onSave({ essential: true, preferences: true, analytics: true, marketing: true })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CookieConsentBanner({
  open,
  onAccept,
  onReject,
  onSavePreferences,
}: {
  open: boolean;
  onAccept: () => void;
  onReject: () => void;
  onSavePreferences?: (preferences: CookieConsentPreferences) => void;
}) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-4 z-[70] px-3 sm:px-4">
        <div className="relative mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_25px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={onReject}
            aria-label="Close cookie message"
            className="absolute right-3 top-3 rounded-md border border-slate-200 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
          >
            <X size={16} />
          </button>

          <div className="flex max-w-6xl flex-col gap-4 pr-10 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-3xl">
              <p className="text-sm font-semibold text-slate-900">We use cookies</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                DukaOS uses cookies and similar technologies to keep our website working, improve your experience and understand how visitors use our site.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Essential cookies are always active. Optional cookies are only used according to your preferences.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                <Link href="/cookie-policy" className="font-medium underline-offset-2 hover:text-primary hover:underline">
                  Cookie Policy
                </Link>
                <span aria-hidden="true">·</span>
                <Link href="/privacy-policy" className="font-medium underline-offset-2 hover:text-primary hover:underline">
                  Privacy Policy
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onReject}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Reject optional
              </button>
              <button
                type="button"
                onClick={() => setPreferencesOpen(true)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Cookie settings
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        onSave={(decision) => {
          setPreferencesOpen(false);
          onSavePreferences?.(decision);
        }}
      />
    </>
  );
}
