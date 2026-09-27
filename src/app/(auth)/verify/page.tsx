import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VerifyPage() {
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Student Verification</CardTitle>
          <Badge variant="campus">Verified Student</Badge>
        </div>
        <CardDescription>
          How the UniVerse ICOS verified-student badge works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-slate-300 space-y-3">
          <p>
            Verification is optional — every campus feature works without it. Students
            who verify earn the <span className="text-campus-400 font-medium">Verified Student</span> badge
            on their profile.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
            <li>Your details are checked against your school&apos;s official student registry.</li>
            <li>A campus admin confirms the match and grants the badge.</li>
            <li>The badge appears on your profile and stays tied to your account.</li>
          </ol>
          <p className="text-xs text-slate-400">
            Badge status is managed by campus administrators. If your registry details match but
            you don&apos;t have the badge yet, contact your campus admin.
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
