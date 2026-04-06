import Image from "next/image";
import { PWARegistrar } from "./pwa-registrar";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LIFT" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <div
        className="flex min-h-screen flex-col items-center bg-[#faf8f5] text-[#1c1917]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
      >
        <header className="flex h-20 w-full items-center justify-center border-b border-[#e8e4df]">
          <Image
            src="/LIFT LOGO.jpeg"
            alt="LIFT"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-lg object-contain"
          />
          <span className="ml-3 font-[family-name:var(--font-display)] text-2xl font-bold text-[#6366f1]">
            LIFT
          </span>
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
