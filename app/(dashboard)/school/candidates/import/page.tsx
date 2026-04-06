"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type CandidateRow = {
  first_name: string;
  last_name: string;
  email: string;
  grade_applying_to: string;
  date_of_birth?: string;
  guardian_name?: string;
  guardian_email?: string;
};

type ImportResult = {
  row: number;
  status: string;
  error?: string;
  name?: string;
};

const EXPECTED_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "grade_applying_to",
];

export default function ImportCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [sendInvites, setSendInvites] = useState(true);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{
    created: number;
    skipped: number;
    total: number;
  } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setCandidates([]);
    setResults(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (json.length === 0) {
          setErrors(["File is empty"]);
          return;
        }

        // Normalize column names (lowercase, trim, replace spaces with underscores)
        const normalized = json.map((row) => {
          const clean: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            const normKey = key
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "_");
            clean[normKey] = String(value ?? "").trim();
          }
          return clean;
        });

        // Validate columns
        const firstRow = normalized[0];
        const missing = EXPECTED_COLUMNS.filter(
          (col) => !(col in firstRow)
        );
        if (missing.length > 0) {
          setErrors([
            `Missing required columns: ${missing.join(", ")}. Found: ${Object.keys(firstRow).join(", ")}`,
          ]);
          return;
        }

        const rows: CandidateRow[] = normalized.map((r) => ({
          first_name: r.first_name ?? "",
          last_name: r.last_name ?? "",
          email: r.email ?? "",
          grade_applying_to: r.grade_applying_to ?? "",
          date_of_birth: r.date_of_birth || undefined,
          guardian_name: r.guardian_name || undefined,
          guardian_email: r.guardian_email || undefined,
        }));

        // Client-side validation
        const rowErrors: string[] = [];
        rows.forEach((r, i) => {
          if (!r.first_name || !r.last_name)
            rowErrors.push(`Row ${i + 1}: Missing name`);
          if (!r.email || !r.email.includes("@"))
            rowErrors.push(`Row ${i + 1}: Invalid email "${r.email}"`);
          const g = parseInt(r.grade_applying_to, 10);
          if (isNaN(g) || g < 6 || g > 11)
            rowErrors.push(
              `Row ${i + 1}: Invalid grade "${r.grade_applying_to}" (6-11)`
            );
        });

        if (rowErrors.length > 0) {
          setErrors(rowErrors.slice(0, 20));
        }

        setCandidates(rows);
      } catch {
        setErrors(["Could not parse file. Please use .xlsx, .xls, or .csv"]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  async function handleImport() {
    setImporting(true);
    setResults(null);

    const res = await fetch("/api/school/candidates/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates, send_invites: sendInvites }),
    });

    const data = await res.json();
    setResults(data.results ?? []);
    setSummary({
      created: data.created ?? 0,
      skipped: data.skipped ?? 0,
      total: data.total ?? 0,
    });
    setImporting(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Candidates</h1>
        <p className="mt-1 text-sm text-muted">
          Upload an Excel (.xlsx) or CSV file with candidate data.
        </p>
      </div>

      {/* Template info */}
      <div className="rounded-lg border border-lift-border bg-surface p-4 text-sm">
        <p className="font-medium">Required columns:</p>
        <p className="mt-1 font-mono text-xs text-muted">
          first_name, last_name, email, grade_applying_to
        </p>
        <p className="mt-2 font-medium">Optional columns:</p>
        <p className="mt-1 font-mono text-xs text-muted">
          date_of_birth, guardian_name, guardian_email
        </p>
      </div>

      {/* File upload */}
      <div>
        <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-lift-border p-8 transition-colors hover:border-primary">
          <div className="text-center">
            <p className="text-sm font-medium">
              {fileName ?? "Click to upload or drag a file"}
            </p>
            <p className="mt-1 text-xs text-muted">.xlsx, .xls, or .csv</p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-review/30 bg-review/5 p-4">
          <p className="text-sm font-medium text-review">
            Validation issues:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-review">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {candidates.length > 0 && !results && (
        <>
          <div className="overflow-x-auto rounded-lg border border-lift-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-lift-border bg-surface text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">First Name</th>
                  <th className="px-3 py-2 font-medium">Last Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Grade</th>
                  <th className="px-3 py-2 font-medium">DOB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {candidates.slice(0, 50).map((c, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    <td className="px-3 py-2">{c.first_name}</td>
                    <td className="px-3 py-2">{c.last_name}</td>
                    <td className="px-3 py-2 text-muted">{c.email}</td>
                    <td className="px-3 py-2">{c.grade_applying_to}</td>
                    <td className="px-3 py-2 text-muted">
                      {c.date_of_birth || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidates.length > 50 && (
              <p className="px-3 py-2 text-xs text-muted">
                Showing first 50 of {candidates.length} rows
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendInvites}
                onChange={(e) => setSendInvites(e.target.checked)}
                className="rounded"
              />
              Send invite emails immediately
            </label>

            <button
              onClick={handleImport}
              disabled={importing || errors.length > 0}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : `Import ${candidates.length} Candidate${candidates.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}

      {/* Results */}
      {summary && results && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-lift-border bg-surface p-4 text-center">
              <p className="text-xs text-muted">Created</p>
              <p className="mt-1 text-2xl font-bold text-success">
                {summary.created}
              </p>
            </div>
            <div className="rounded-lg border border-lift-border bg-surface p-4 text-center">
              <p className="text-xs text-muted">Skipped/Errors</p>
              <p className="mt-1 text-2xl font-bold text-warning">
                {summary.skipped}
              </p>
            </div>
            <div className="rounded-lg border border-lift-border bg-surface p-4 text-center">
              <p className="text-xs text-muted">Total</p>
              <p className="mt-1 text-2xl font-bold">{summary.total}</p>
            </div>
          </div>

          {results.filter((r) => r.status !== "created").length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-lift-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-lift-border bg-surface text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lift-border">
                  {results
                    .filter((r) => r.status !== "created")
                    .map((r) => (
                      <tr key={r.row}>
                        <td className="px-3 py-2 text-muted">{r.row}</td>
                        <td className="px-3 py-2">{r.name ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              r.status === "error"
                                ? "bg-review/10 text-review"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {r.error}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => router.push("/school/candidates")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to Candidates
          </button>
        </div>
      )}
    </div>
  );
}
