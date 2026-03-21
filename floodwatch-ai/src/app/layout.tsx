import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { RealtimeProvider } from "@/context/RealtimeContext";

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
          <Sidebar />
          <main className="flex-1 h-full overflow-hidden bg-slate-950">
            {children}
          </main>
        </RealtimeProvider>
      </body>
    </html>
  );
}
