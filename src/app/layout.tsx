import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/context/AuthProvider";
import { E2eeProvider } from "@/context/E2eeContext";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";
import { Toaster } from "@/components/ui/toaster";
import InspectProtectionGuard from "@/components/InspectProtectionGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Veil",
  description: "The world's most elegant anonymous messaging platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <DynamicBackground />
        <AuthProvider>
          <InspectProtectionGuard />
          <E2eeProvider>
            <Navbar />
            <div className="pt-14 pb-20 md:pb-0 min-h-[calc(100dvh-3.5rem)]">
              {children}
            </div>
            <Toaster />
          </E2eeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
