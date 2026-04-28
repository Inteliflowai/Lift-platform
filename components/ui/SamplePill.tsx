/**
 * Small muted pill marking a candidate as seeded sample data (Jamie Rivera /
 * Alex Chen / Sofia Okafor and PT equivalents, plus Stripe-seeded
 * placeholders). Renders next to the candidate's name on the candidates list,
 * candidate detail header, and any other surface that displays sample data
 * alongside real data. Muted gray — not teal, since teal would imply a status.
 */
export function SamplePill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-muted/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted ${className}`}
      title="Seeded sample candidate — not a real applicant"
    >
      Sample
    </span>
  );
}
