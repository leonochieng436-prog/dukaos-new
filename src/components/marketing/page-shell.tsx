"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, Globe2, Menu, X } from "lucide-react";

const navItems = [
  ["About", "/about"],
  ["Features", "/#features"],
  ["How it works", "/#how-it-works"],
  ["Who it is for", "/#industries"],
  ["Pricing", "/#pricing"],
  ["Contact", "/contact"],
] as const;

export function BrandMark({ footer = false }: { footer?: boolean }) {
  return footer ? (
    <Link href="/" aria-label="DukaOS home">
      <Image
        src="/images/DukaOS-logo2.png"
        alt="DukaOS"
        width={160}
        height={40}
        className="h-10 w-auto object-contain"
        style={{ width: "auto", height: "auto" }}
        priority
      />
    </Link>
  ) : (
    <Link href="/" aria-label="DukaOS home">
      <Image
        src="/images/DukaOS-logo2.png"
        alt="DukaOS"
        width={160}
        height={40}
        className="h-10 w-auto object-contain"
        style={{ width: "auto", height: "auto" }}
        priority
      />
    </Link>
  );
}

export function MarketingPageHeader({ active }: { active?: "about" | "contact" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#dce8e3]/80 bg-[#f8faf9]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={
                (active === "about" && href === "/about") || (active === "contact" && href === "/contact")
                  ? "text-foreground"
                  : "hover:text-foreground"
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="px-3 py-2 text-sm font-medium hover:text-primary">
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,123,108,0.18)] hover:bg-primary-hover"
          >
            Get started <ArrowRight size={15} />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="grid h-10 w-10 place-items-center rounded-md border border-border bg-white lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-border bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-sm">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-3"
              >
                {label}
              </Link>
            ))}
            <Link href="/login" className="mt-2 px-3 py-3 font-medium text-primary" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Get started <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#103f38] text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-sm">
            <BrandMark footer />
            <p className="mt-5 text-[15px] font-medium text-[#d8f7e8]">More than a till.</p>
            <p className="mt-2 text-sm leading-6 text-emerald-50/70">Your business operating system.</p>
            <p className="mt-4 text-sm leading-6 text-emerald-50/70">
              Manage sales, inventory, customers, payments, and your entire business from one connected platform.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8de0c1]">Product</p>
            <ul className="mt-5 space-y-3 text-sm text-emerald-50/75">
              {['POS', 'Inventory', 'Sales', 'Customers', 'Purchases', 'Suppliers', 'Payments', 'Reports'].map((item) => (
                <li key={item}>
                  <Link href="/#features" className="hover:text-white">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8de0c1]">Business</p>
            <ul className="mt-5 space-y-3 text-sm text-emerald-50/75">
              {[
                'Pricing',
                'Retail',
                'Supermarkets',
                'Restaurants',
                'Pharmacies',
                'Wholesalers',
                'Multi-branch',
              ].map((item) => (
                <li key={item}>
                  <Link href="/#pricing" className="hover:text-white">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8de0c1]">Resources</p>
            <ul className="mt-5 space-y-3 text-sm text-emerald-50/75">
              {['Help Center', 'Documentation', 'Getting Started', 'FAQs', 'Support', 'System Status'].map((item) => (
                <li key={item}>
                  <Link href="/#faq" className="hover:text-white">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8de0c1]">Company</p>
            <ul className="mt-5 space-y-3 text-sm text-emerald-50/75">
              {[
                { label: 'About DukaOS', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Careers', href: '/contact' },
                { label: 'Partners', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8de0c1]">Connect with us</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-emerald-50/75">
                {['Instagram', 'WhatsApp', 'Facebook', 'LinkedIn'].map((item) => (
                  <Link key={item} href="#" className="hover:text-white">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 text-sm text-emerald-50/60 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} DukaOS. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { label: 'Privacy Policy', href: '/privacy-policy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Cookie Policy', href: '/cookie-policy' },
              { label: 'Status', href: '/' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-emerald-50/50">
          <Globe2 size={14} />
          <span>Built for African businesses</span>
        </div>
      </div>
    </footer>
  );
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 260);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 right-5 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary text-white shadow-[0_14px_30px_rgba(15,123,108,0.22)] transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <ArrowUp size={18} />
    </button>
  );
}

export function RevealOnScroll() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal-on-scroll");

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.14 },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return null;
}

export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
