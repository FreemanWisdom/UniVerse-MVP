"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminSchool, StudentImportResult } from "@/features/admin/admin.types";
import { importStudentRows, listAdminSchools, prepareStudentImport } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSelect,
  AdminTD,
  AdminTH,
  AdminTableWrap,
} from "@/components/admin/ui";
import { IconUpload } from "@/components/admin/icons";

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
      <AdminPageHeader
        title="Verification"
        description="School registries that power student verification, and registry imports."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={3} />
      ) : (
        <AdminTableWrap>
          <thead>
            <tr>
              <AdminTH>School</AdminTH>
              <AdminTH>Registry students</AdminTH>
              <AdminTH>Verification</AdminTH>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="transition-colors hover:bg-slate-50/60">
                <AdminTD className="font-medium text-slate-900">{school.name}</AdminTD>
                <AdminTD>{school.student_count}</AdminTD>
                <AdminTD>
                  <AdminPill tone={school.verification_enabled ? "success" : "neutral"}>
                    {school.verification_enabled ? "enabled" : "disabled"}
                  </AdminPill>
                </AdminTD>
              </tr>
            ))}
          </tbody>
        </AdminTableWrap>
      )}

      <AdminCard>
        <AdminCardHeader
          title="Import student registry"
          description="CSV upload — rows are matched by matric number, up to 10,000 per file."
        />
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label htmlFor="import-school" className="text-xs font-medium text-slate-600">
              School
            </label>
            <AdminSelect
              id="import-school"
              aria-label="School for import"
              value={selectedSchool}
              onChange={(event) => setSelectedSchool(event.target.value)}
            >
              <option value="">Select a verification-enabled school…</option>
              {enabledSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </AdminSelect>
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              selectedSchool && !busy
                ? "border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/30"
                : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <IconUpload size={17} />
            </span>
            <span className="text-sm font-medium text-slate-700">
              {busy ? `Importing ${fileName ?? "file"}…` : "Click to choose a CSV file"}
            </span>
            <span className="text-xs text-slate-400">
              Header row: matric_number, full_name, faculty, department, level, programme
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="CSV file"
              disabled={!selectedSchool || busy}
              onChange={(event) => void onFile(event)}
              className="hidden"
            />
          </label>

          <p className="text-xs text-slate-400">
            Rows are upserted by matric number. Simple CSV only — quoted commas are not parsed.
          </p>

          {result ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-sm" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{result.processed} processed</span>
                <AdminPill tone="success">{result.inserted_or_updated} upserted</AdminPill>
                <AdminPill tone={result.rejected > 0 ? "warning" : "neutral"}>{result.rejected} rejected</AdminPill>
              </div>
              {result.errors.slice(0, 10).map((rowError, index) => (
                <p key={index} className="text-xs text-slate-500">
                  {rowError.matric_number ?? "unknown"}: {rowError.error}
                </p>
              ))}
              {result.errors.length > 10 ? (
                <p className="text-xs text-slate-400">…and {result.errors.length - 10} more.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
