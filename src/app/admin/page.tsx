import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
          <p className="text-sm text-slate-400">Structural Shell (Authorization and features isolated).</p>
        </div>
        <Badge variant="outline">Route: /admin</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UniVerse ICOS — Administration</CardTitle>
          <CardDescription>
            Structural shell placeholder for administrative operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            Per architectural constraints, administrative security relies on backend <code>admin.*</code> tables and authorization, not frontend email checks. No administrative privileges or workflows are implemented in this phase.
          </p>
          <div className="flex gap-3">
            <Link href="/admin/overview">
              <Button variant="secondary" size="sm">Go to Overview</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
