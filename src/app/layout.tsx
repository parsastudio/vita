import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GuestBanner } from "@/components/auth/guest-banner";
import { AuthModal } from "@/components/auth/auth-modal";
import { ErrorBoundary } from "@/components/error-boundary";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ویتا - فضای شخصی هوشمند",
  description: "فضای شخصی مدرن، ماژولار و اول‌-آفلاین شما",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ویتا",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/10 overflow-x-hidden">
        <ErrorBoundary>
          <Providers>
            <GuestBanner />
            <div className="flex-1 flex flex-col">{children}</div>
            <AuthModal />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
