import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { Header } from "@/components/Header";

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
        <SettingsProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-border-subtle py-6">
            <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground-muted">
              <span>Guardian Line — built for Lumora Hacks Summer 2026.</span>
              <span>Privacy-first: voice analysis runs on-device.</span>
            </div>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
