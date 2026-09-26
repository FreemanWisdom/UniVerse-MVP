import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminVerificationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Verification Management</h1>
        <Badge variant="outline">Route: /admin/verification</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Verification Management</CardTitle>
          <CardDescription>Foundation placeholder for verification workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">Route loaded successfully within the Admin Shell.</p>
        </CardContent>
      </Card>
    </div>
  );
}
