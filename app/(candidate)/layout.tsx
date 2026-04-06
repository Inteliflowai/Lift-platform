import Image from "next/image";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#fafaf9] text-[#1a1a2e]">
      <header className="flex h-20 w-full items-center justify-center border-b border-[#e8e8e8]">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={56}
          height={56}
          priority
          className="h-14 w-14 rounded-lg"
        />
      </header>
      <main className="w-full max-w-[680px] flex-1 px-6 py-10">
        {children}
      </main>
      <footer className="w-full border-t border-[#e8e8e8] py-5 text-center text-[11px] leading-relaxed text-[#999]">
        LIFT is not a diagnostic tool. Results are intended to support admissions
        review and do not constitute a clinical, psychological, or educational
        diagnosis.
      </footer>
    </div>
  );
}
