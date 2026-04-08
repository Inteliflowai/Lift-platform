"use client";

import Image from "next/image";
import { AlertTriangle, Download } from "lucide-react";

export function SuspendedClient({
  schoolName,
  firstName,
  isTrialExpiry,
  dataDeletionDate,
}: {
  schoolName: string;
  firstName: string;
  isTrialExpiry: boolean;
  dataDeletionDate: string | null;
}) {
  const deletionDate = dataDeletionDate
    ? new Date(dataDeletionDate)
    : null;
  const deletionStr = deletionDate?.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const daysUntilDeletion = deletionDate
    ? Math.max(
        0,
        Math.ceil(
          (deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 rounded-xl object-contain"
        />

        <div className="mt-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f43f5e]/10">
            <AlertTriangle size={28} className="text-[#f43f5e]" />
          </div>
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-lift-text">
          {isTrialExpiry
            ? "Your trial has ended"
            : "Your subscription has lapsed"}
        </h1>

        <p className="mt-3 text-sm text-muted">
          Hi {firstName}, {schoolName}&apos;s LIFT account has been suspended.
          {isTrialExpiry
            ? " Your 30-day free trial has ended."
            : " Please renew your subscription to restore access."}
        </p>

        {deletionStr && daysUntilDeletion !== null && (
          <div className="mt-4 rounded-lg border border-[#f43f5e]/20 bg-[#f43f5e]/5 p-4">
            <p className="text-sm font-medium text-[#f43f5e]">
              Data safe until {deletionStr}
            </p>
            <p className="mt-1 text-xs text-[#f43f5e]/70">
              {daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""} until
              data deletion
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/school/settings/subscription"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:opacity-90 transition-opacity"
          >
            Upgrade Now
          </a>
          <a
            href="mailto:support@inteliflowai.com"
            className="rounded-lg border border-lift-border px-6 py-3 text-sm font-medium text-lift-text hover:bg-surface transition-colors"
          >
            Talk to Our Team
          </a>
        </div>

        <button
          onClick={() => {
            window.open("/api/exports/data-export", "_blank");
          }}
          className="mt-4 flex items-center justify-center gap-1.5 mx-auto text-xs text-muted hover:text-lift-text transition-colors"
        >
          <Download size={12} />
          Export your data
        </button>
      </div>
    </div>
  );
}
