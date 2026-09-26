import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Overview</h1>
        <Badge variant="outline">Route: /admin/overview</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview Dashboard</CardTitle>
          <CardDescription>Foundation placeholder for campus administrative overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">Route loaded successfully within the Admin Shell.</p>
        </CardContent>
      </Card>
    </div>
  );
}
