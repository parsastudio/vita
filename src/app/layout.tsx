import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GuestBanner } from "@/components/auth/guest-banner";
import { AuthModal } from "@/components/auth/auth-modal";
import { PwaBanner } from "@/components/pwa/pwa-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = localFont({
  src: "../../public/Vazirmatn.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "vita - Personal Intelligent Space",
  description: "Your personalized, modular, offline-first dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/10">
        <Providers>
          <GuestBanner />
          <div className="flex-1 flex flex-col">{children}</div>
          <AuthModal />
          <PwaBanner />
        </Providers>
      </body>
    </html>
  );
}
