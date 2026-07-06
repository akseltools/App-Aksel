/**
 * app/layout.tsx
 * Root layout for the Aksel Tools application.
 * - Loads Outfit font from Google Fonts
 * - Sets dark theme metadata
 * - Wraps app in AuthProvider
 * - Renders global Toaster for notifications
 */

import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { Toaster } from "@/components/ui/toaster";

// ─── Font Configuration ───────────────────────────────────────────────────────
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "Aksel Tools — Gestão de Estoque & CRM",
    template: "%s | Aksel Tools",
  },
  description:
    "Sistema de gestão de estoque, consignação e vendas da Aksel Tools.",
  robots: {
    index: false,   // Internal tool — do not index
    follow: false,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${outfit.variable} font-sans bg-[#0a0a0a] text-white antialiased`}>
        <AuthProvider>
          {children}
          {/* Global toast notification container */}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
