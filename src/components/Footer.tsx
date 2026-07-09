"use client";

import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";

export function Footer() {
  const { settings } = useSettings();
  const lang = settings.language;

  const links = [
    { href: "/about", label: lang === "en" ? "About" : "Acerca de" },
    { href: "/faq", label: "FAQ" },
    { href: "/glossary", label: lang === "en" ? "Glossary" : "Glosario" },
    { href: "/privacy", label: lang === "en" ? "Privacy" : "Privacidad" },
    { href: "/terms", label: lang === "en" ? "Terms" : "Términos" },
  ];

  return (
    <footer className="border-t border-border-subtle py-6">
      <div className="mx-auto max-w-6xl px-5 flex flex-col gap-4">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-foreground-muted sm:justify-start">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground-muted">
          <span>© {new Date().getFullYear()} Guardian Line. Not a substitute for professional fraud guidance.</span>
          <span>Privacy-first: voice analysis runs on-device.</span>
        </div>
      </div>
    </footer>
  );
}
