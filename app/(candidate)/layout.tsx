import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { PWARegistrar } from "./pwa-registrar";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LIFT",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="flex min-h-screen flex-col items-center bg-[#faf8f5] text-[#1c1917]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
      >
        <header className="flex h-44 w-full items-center justify-center border-b border-[#e8e4df]">
          <Image
            src="/LIFT-LOGO.png"
            alt="LIFT"
            width={144}
            height={144}
            priority
            className="h-[144px] w-[144px] rounded-lg object-contain"
          />
        </header>
        <main className="w-full max-w-[720px] flex-1 px-4 py-8 md:px-0 md:py-12">
          {children}
        </main>
        <footer className="w-full border-t border-[#e8e4df] py-5 text-center font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[#9ca3af]">
          LIFT is not a diagnostic tool. Results are intended to support admissions
          review and do not constitute a clinical, psychological, or educational
          diagnosis.
        </footer>
        <PWARegistrar />
      </div>
    </>
  );
}
