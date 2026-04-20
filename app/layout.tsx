import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getLocale, getBrand } from "@/lib/i18n/config";
import { LinkedInInsightTag } from "@/components/LinkedInInsightTag";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { PHProvider } from "./providers";
import { PostHogPageView } from "./PostHogPageView";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const brand = getBrand();

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    "Non-diagnostic admissions and readiness insight platform by Inteliflow AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={getLocale()}
      suppressHydrationWarning
      className={`${jakarta.variable} ${dmSans.variable} ${geistMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="font-[family-name:var(--font-body)] antialiased"
      >
        <LocaleProvider
          locale={getLocale()}
          brandName={brand.name}
          brandTagline={brand.tagline}
          hidePricing={brand.hidePricing}
        >
          <PHProvider>
            <PostHogPageView />
            {children}
          </PHProvider>
        </LocaleProvider>
        <LinkedInInsightTag />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
