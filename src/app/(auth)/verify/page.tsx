import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VerifyPage() {
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Verification Entry</CardTitle>
          <Badge variant="campus">Security Sensitive</Badge>
        </div>
        <CardDescription>
          UniVerse ICOS student verification entry point (Foundation Placeholder).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-slate-300">
          <p className="font-mono text-xs text-campus-400">Route: /verify</p>
          <p className="mt-2 text-xs text-slate-400">
            Existing student verification infrastructure (student_registry, Edge Functions) will remain strictly isolated and integrated during its designated phase.
          </p>
        </div>

        <Link href="/orbit" className="block w-full">
          <Button className="w-full" variant="default">
            Go to Student Orbit
          </Button>
        </Link>
      </CardContent>
    </>
  );
}
