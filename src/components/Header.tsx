"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { ShieldIcon } from "./icons";

export function Header() {
  const { settings, updateSettings, strings } = useSettings();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: strings.nav.home },
    { href: "/dashboard", label: strings.nav.dashboard },
    { href: "/demo", label: strings.nav.demo },
    { href: "/reports", label: strings.nav.reports },
    { href: "/settings", label: strings.nav.settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <ShieldIcon className="h-7 w-7 text-accent" />
          <span className="text-[15px] font-semibold tracking-tight">
            {strings.appName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-background-elevated text-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateSettings({ language: settings.language === "en" ? "es" : "en" })}
            className="rounded-full border border-border-subtle px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-border-strong hover:text-foreground transition-colors"
            aria-label="Toggle language"
          >
            {settings.language === "en" ? "EN" : "ES"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dim transition-colors"
          >
            {strings.nav.dashboard}
          </Link>
        </div>
      </div>
      <nav className="flex md:hidden gap-1 overflow-x-auto px-5 pb-3 -mt-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                active ? "bg-background-elevated text-foreground" : "text-foreground-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
