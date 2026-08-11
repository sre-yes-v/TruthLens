/**
 * Root layout — wraps every route.
 *
 * Three things live here because every page needs them:
 *   • the sticky Header
 *   • the ToastProvider (the app's only global state)
 *   • the flag-gated PrototypeMap reviewer aid
 *
 * This file is a Server Component. The interactive pieces inside it declare
 * "use client" themselves, so only those ship JavaScript to the browser.
 */
import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { PrototypeMap } from "@/components/dev/PrototypeMap";
import { ToastProvider } from "@/hooks/useToast";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1877F2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          {/* Lets keyboard users jump past the header straight to content. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-btn focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lift"
          >
            Skip to content
          </a>

          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>

          <PrototypeMap />
        </ToastProvider>
      </body>
    </html>
  );
}
