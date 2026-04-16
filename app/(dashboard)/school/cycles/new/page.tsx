"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  `${currentYear}-${currentYear + 1}`,
  `${currentYear + 1}-${currentYear + 2}`,
  `${currentYear + 2}-${currentYear + 3}`,
];

export default function NewCyclePage() {
  const router = useRouter();
  const [academicYear, setAcademicYear] = useState(YEAR_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cycleName = `${academicYear} Admissions`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/school/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cycleName,
        academic_year: academicYear,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create cycle");
      setLoading(false);
      return;
    }

    const cycle = await res.json();
    router.push(`/school/cycles/${cycle.id}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton href="/school/cycles" label="Cycles" />
      <h1 className="text-2xl font-bold">New Admissions Cycle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted">Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            {YEAR_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-lift-border bg-page-bg p-4">
          <p className="text-sm text-lift-text">
            Cycle name: <strong>{cycleName}</strong>
          </p>
          <p className="mt-1 text-xs text-muted">
            The cycle stays active until you archive it — no open or close dates needed.
          </p>
        </div>

        {error && <p className="text-xs text-review">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Cycle"}
        </button>
      </form>

      <p className="text-xs text-muted">
        Task templates for Grade 6-7, Grade 8, and Grade 9-11 experiences
        will be configured automatically.
      </p>
    </div>
  );
}
