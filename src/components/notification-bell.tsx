"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CreditCard, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationTone = "warning" | "danger" | "info";

export type DashboardNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: NotificationTone;
};

const toneStyles: Record<NotificationTone, { icon: typeof AlertTriangle; className: string }> = {
  warning: { icon: AlertTriangle, className: "bg-warning-tint text-warning" },
  danger: { icon: AlertTriangle, className: "bg-danger-tint text-danger" },
  info: { icon: CreditCard, className: "bg-info-tint text-info" },
};

export function NotificationBell({ notifications }: { notifications: DashboardNotification[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${notifications.length ? `, ${notifications.length} need attention` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        title="Notifications"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[0_16px_36px_rgba(18,23,26,0.14)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Needs attention</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {notifications.length ? `${notifications.length} active alert${notifications.length === 1 ? "" : "s"}` : "Everything is up to date"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-7 text-center">
              <Bell size={22} className="mx-auto text-success" />
              <p className="mt-2 text-sm font-medium">No urgent items</p>
              <p className="mt-1 text-xs text-muted-foreground">Your stock, sales, and accounts look clear.</p>
            </div>
          ) : (
            <div className="max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto p-2">
              {notifications.map((notification) => {
                const { icon: Icon, className } = toneStyles[notification.tone];
                return (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 rounded-[var(--radius-sm)] px-2 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] ${className}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{notification.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{notification.detail}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
