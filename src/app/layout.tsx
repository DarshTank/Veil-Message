// app/layout.tsx (Root Layout)
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/context/AuthProvider";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";
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
          <Navbar />
          <div className="pt-20"> {/* Add padding for fixed navbar */}
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
