import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="mb-5 text-muted/30">{icon}</div>
      <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-lift-text text-center">
        {title}
      </h2>
      <p className="mt-2 max-w-[360px] text-center text-[15px] text-muted leading-relaxed">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {action.label}
        </Link>
      )}
      {secondaryAction && (
        <Link
          href={secondaryAction.href}
          className="mt-3 text-sm text-muted hover:text-primary transition-colors"
        >
          {secondaryAction.label}
        </Link>
      )}
    </div>
  );
}

// Simple SVG illustrations for empty states

export function EmptyCandidatesIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="40" height="55" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="30" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M28 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" />
      <path d="M40 65v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyQueueIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="20" width="50" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="15" width="40" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M35 40l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyCyclesIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="18" width="50" height="45" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="15" y1="30" x2="65" y2="30" stroke="currentColor" strokeWidth="2" />
      <line x1="30" y1="18" x2="30" y2="30" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="18" x2="50" y2="30" stroke="currentColor" strokeWidth="2" />
      <path d="M36 44h8m-4-4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyTeamIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M18 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" />
      <circle cx="52" cy="30" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M40 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

export function EmptyReportsIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="50" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="22" y="45" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="36" y="35" width="8" height="24" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="50" y="40" width="8" height="19" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <text x="27" y="34" fill="currentColor" fontSize="10" fontFamily="sans-serif">?</text>
      <text x="41" y="29" fill="currentColor" fontSize="10" fontFamily="sans-serif">?</text>
    </svg>
  );
}

export function EmptyBuildingIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="15" width="40" height="50" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="28" y="22" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="44" y="22" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="34" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="44" y="34" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="34" y="50" width="12" height="15" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
