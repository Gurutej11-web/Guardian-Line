import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";
import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardian Line — Real-Time Voice-Clone & Scam Call Detection",
  description:
    "Guardian Line listens alongside your calls in real time and warns you the moment a voice sounds cloned or a conversation turns into a scam — before you send the money.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent-solid focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SettingsProvider>
          <ToastProvider>
            <Header />
            <main id="main-content" className="flex-1 flex flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            <footer className="border-t border-border-subtle py-6">
              <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground-muted">
                <span>© {new Date().getFullYear()} Guardian Line. Not a substitute for professional fraud guidance.</span>
                <span>Privacy-first: voice analysis runs on-device.</span>
              </div>
            </footer>
            <ScrollToTop />
            <ServiceWorkerRegistration />
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
