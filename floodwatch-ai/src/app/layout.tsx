import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloodWatch AI | Miami-Dade County",
  description: "Real-time municipal flood intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased h-screen overflow-hidden bg-slate-950 text-slate-50 flex`}
      >
        <RealtimeProvider>
          <AppShell>
            {children}
          </AppShell>
        </RealtimeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
