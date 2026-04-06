import Image from "next/image";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#faf8f5] text-[#1c1917]">
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
      <main className="w-full max-w-[720px] flex-1 px-6 py-12 md:px-0">
        {children}
      </main>
      <footer className="w-full border-t border-[#e8e4df] py-5 text-center font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[#9ca3af]">
        LIFT is not a diagnostic tool. Results are intended to support admissions
        review and do not constitute a clinical, psychological, or educational
        diagnosis.
      </footer>
    </div>
  );
}
