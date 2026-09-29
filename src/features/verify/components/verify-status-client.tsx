"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface SchoolOption {
  id: string;
  name: string;
  slug: string;
}

interface VerifyStatusClientProps {
  fullName: string;
  university: string | null;
  studentVerified: boolean;
  emailConfirmed: boolean;
}

type CheckResult =
  | { code: "verified"; detail: string }
  | { code: "not_verified"; detail: string }
  | { code: "school_unavailable"; detail: string }
  | { code: "invalid_input"; detail: string }
  | { code: "error"; detail: string };

export function VerifyStatusClient({
  fullName,
  university,
  studentVerified,
  emailConfirmed,
}: VerifyStatusClientProps) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [matricNumber, setMatricNumber] = useState("");
  const [checkName, setCheckName] = useState(fullName);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const campusInRegistry = schools.find(
    (school) => university && school.name.toLowerCase() === university.toLowerCase()
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke<
          SchoolOption[] | { schools: SchoolOption[] }
        >("verify-student-public", { method: "GET" });
        if (cancelled) return;
        if (error) return;
        const list = Array.isArray(data) ? data : data?.schools ?? [];
        setSchools(list);
      } catch {
        /* picker stays empty; the check will surface its own error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = async () => {
    if (!campusInRegistry || !matricNumber.trim() || !checkName.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke<{
        verified?: boolean;
        result_code?: string;
        faculty?: string;
        department?: string;
        level?: string;
      }>("verify-student", {
        body: {
          school_id: campusInRegistry.id,
          full_name: checkName.trim(),
          matric_number: matricNumber.trim(),
        },
      });

      if (error) {
        let status = 0;
        let bodyText = "";
        try {
          status = (error.context as Response)?.status ?? 0;
          bodyText = await ((error.context as Response)?.json?.().catch(() => "") ?? "");
        } catch {
          /* context may be absent */
        }
        if (status === 503 || /temporarily unavailable/i.test(bodyText)) {
          setResult({
            code: "school_unavailable",
            detail:
              "Verification isn't available for your school yet — its student registry hasn't been imported. Your campus admin grants badges once it is.",
          });
        } else if (status === 429 || /rate|too many/i.test(bodyText + error.message)) {
          setResult({
            code: "error",
            detail: "Too many checks — try again in a few minutes.",
          });
        } else {
          setResult({
            code: "error",
            detail: "The check couldn't run right now. Try again shortly.",
          });
        }
        return;
      }

      switch (data?.result_code) {
        case "verified":
          setResult({
            code: "verified",
            detail:
              "Your details match your school's official registry. Your campus admin grants the badge — it stays tied to your account.",
          });
          break;
        case "not_verified":
          setResult({
            code: "not_verified",
            detail:
              "No match in your school's registry for this matric number and name. Check the details, or contact your campus admin.",
          });
          break;
        case "school_unavailable":
          setResult({
            code: "school_unavailable",
            detail:
              "Verification isn't available for your school yet — its student registry hasn't been imported. Your campus admin grants badges once it is.",
          });
          break;
        default:
          setResult({
            code: data?.result_code === "invalid_input" ? "invalid_input" : "error",
            detail:
              data?.result_code === "invalid_input"
                ? "Enter a valid matric number."
                : "The check couldn't complete. Try again shortly.",
          });
      }
    } catch {
      setResult({ code: "error", detail: "The check couldn't run right now. Try again shortly." });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Verified Student badge</p>
            <p className="mt-0.5 text-sm text-foreground truncate">
              {fullName || "Your account"}
            </p>
          </div>
          {studentVerified ? (
            <Badge variant="campus">Verified Student</Badge>
          ) : (
            <span className="text-xs text-slate-400">Not verified yet</span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Campus</p>
            <p className="mt-0.5 text-sm text-foreground">
              {university || "No campus set"}
            </p>
          </div>
          {!university && (
            <span className="text-xs text-slate-400 text-right max-w-[55%]">
              Chat, study, and tribes are matched to your campus — contact your
              campus admin to set yours.
            </span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
          <span className="text-sm text-slate-300">
            {emailConfirmed ? "Confirmed" : "Not confirmed yet"}
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-surface-200 bg-surface-50/60 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Check against your school&apos;s registry</p>
          <p className="mt-1 text-xs text-slate-400">
            A read-only check — it never changes your badge. Badges are granted by
            campus admins.
          </p>
        </div>

        {!university ? (
          <p className="text-xs text-slate-400">
            You need a campus on your profile first. Contact your campus admin.
          </p>
        ) : !campusInRegistry ? (
          <p className="text-xs text-slate-400">
            Verification isn&apos;t available for &ldquo;{university}&rdquo; yet. Your
            campus admin grants badges once your school&apos;s registry is imported.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="verify-name" className="text-xs font-medium text-slate-300">
                Full name (as registered)
              </label>
              <Input
                id="verify-name"
                value={checkName}
                onChange={(event) => setCheckName(event.target.value)}
                placeholder="Your full name"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="verify-matric" className="text-xs font-medium text-slate-300">
                Matric number
              </label>
              <Input
                id="verify-matric"
                value={matricNumber}
                onChange={(event) => setMatricNumber(event.target.value)}
                placeholder="e.g. 2023/123456"
                maxLength={100}
              />
            </div>
            <Button
              onClick={() => void runCheck()}
              disabled={checking || !matricNumber.trim() || !checkName.trim()}
              variant="outline"
              size="sm"
            >
              {checking ? "Checking…" : "Check my status"}
            </Button>
          </>
        )}

        {result && (
          <div
            role="status"
            className={
              "rounded-lg px-3 py-2 text-xs leading-relaxed " +
              (result.code === "verified"
                ? "border border-campus-500/40 bg-campus-500/10 text-campus-400"
                : result.code === "school_unavailable" || result.code === "error"
                  ? "border border-surface-300 bg-surface-100 text-slate-400"
                  : "border border-amber-700/40 bg-amber-950/20 text-amber-400")
            }
          >
            {result.detail}
          </div>
        )}
      </div>
    </div>
  );
}
