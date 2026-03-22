import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { Analytics } from "@vercel/analytics/next";

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
        className="antialiased h-screen overflow-hidden bg-slate-950 text-slate-50 flex"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
      >
        <RealtimeProvider>
          <AppShell>
            {children}
          </AppShell>
        </RealtimeProvider>
        <Analytics />
      </body>
    </html>
  );
}
