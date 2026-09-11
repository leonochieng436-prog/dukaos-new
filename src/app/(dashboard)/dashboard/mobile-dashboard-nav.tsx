"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { DashboardNavItem } from "./dashboard-nav";
import { DashboardNav } from "./dashboard-nav";

export function MobileDashboardNav({ items }: { items: DashboardNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <form action={logout} className="hidden sm:block">
        <button
          type="submit"
          aria-label="Log out"
          title="Log out"
          className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut size={17} />
        </button>
      </form>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <Menu size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="mobile-nav-backdrop absolute inset-0 bg-foreground/30"
          />
          <aside className="mobile-nav-panel relative h-full w-[min(86vw,320px)] overflow-y-auto bg-surface px-4 py-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm font-bold tracking-[0.15em]">DUKAOS</Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <DashboardNav items={items} onNavigate={() => setOpen(false)} />
            <form action={logout} className="mt-6 border-t border-border pt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                onClick={() => setOpen(false)}
              >
                <span>Log out</span>
                <LogOut size={16} />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
