"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { AdminSchool, StudentImportResult } from "@/features/admin/admin.types";
import { importStudentRows, listAdminSchools, prepareStudentImport } from "@/services/admin/admin.service";

/**
 * Student registry import. LIVE-VERIFIED backend flow:
 * admin_prepare_student_import(school, file, rows) creates an import job,
 * import_student_rows(school, rows) upserts the student_registry
 * (requires matric_number + full_name; 10,000 row cap; per-row errors).
 * Only verification-enabled schools can be imported into.
 */

const HEADER_KEYS = ["matric_number", "full_name", "faculty", "department", "level", "programme"] as const;

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase().replace(/^"|"$/g, ""));
  const rows: Array<Record<string, string>> = [];

  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    if (cells.every((cell) => cell === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if ((HEADER_KEYS as readonly string[]).includes(header)) {
        row[header] = cells[index] ?? "";
      }
    });
    if (row.matric_number && row.full_name) rows.push(row);
  }

  return rows;
}

export default function AdminVerificationPage() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledSchools = schools.filter((school) => school.verification_enabled);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        setSchools(await listAdminSchools(createClient()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    setFileName(null);

    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      setError("No valid rows found. The CSV needs a header row with at least matric_number and full_name.");
      return;
    }
    if (rows.length > 10000) {
      setError(`That file has ${rows.length} rows; the backend caps imports at 10,000.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await prepareStudentImport(supabase, selectedSchool, file.name, rows.length);
      setResult(await importStudentRows(supabase, selectedSchool, rows));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The import failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verification</h1>
        <p className="text-sm text-slate-400">School registries that power student verification, and registry imports.</p>
      </div>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading schools…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-xs text-slate-500">
                    <th className="p-3">School</th>
                    <th className="p-3">Registry students</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} className="border-b border-surface-200/60">
                      <td className="p-3 text-slate-200">{school.name}</td>
                      <td className="p-3 text-slate-300">{school.student_count}</td>
                      <td className="p-3">
                        <span className={school.verification_enabled ? "text-campus-400" : "text-slate-500"}>
                          {school.verification_enabled ? "enabled" : "disabled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Import student registry (CSV)</p>
          <select
            aria-label="School for import"
            value={selectedSchool}
            onChange={(event) => setSelectedSchool(event.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-surface-50 p-2 text-sm text-foreground"
          >
            <option value="">Select a verification-enabled school…</option>
            {enabledSchools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            disabled={!selectedSchool || busy}
            onChange={(event) => void onFile(event)}
            className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 disabled:opacity-50"
          />

          <p className="text-[11px] text-slate-500">
            Header row: matric_number, full_name, faculty, department, level, programme. Rows are upserted by
            matric number (10,000 rows max). Simple CSV only — quoted commas are not parsed.
          </p>

          {busy ? <p className="text-sm text-slate-400" aria-live="polite">Importing {fileName ?? "file"}…</p> : null}

          {result ? (
            <div className="space-y-1 rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm" aria-live="polite">
              <p className="text-slate-200">
                Processed {result.processed} · <span className="text-campus-400">{result.inserted_or_updated} upserted</span> ·{" "}
                <span className={result.rejected > 0 ? "text-amber-400" : "text-slate-400"}>{result.rejected} rejected</span>
              </p>
              {result.errors.slice(0, 10).map((rowError, index) => (
                <p key={index} className="text-xs text-slate-500">
                  {rowError.matric_number ?? "unknown"}: {rowError.error}
                </p>
              ))}
              {result.errors.length > 10 ? (
                <p className="text-xs text-slate-500">…and {result.errors.length - 10} more.</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
