import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
        <Badge variant="outline">Route: /admin/users</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Foundation placeholder for student accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">Route loaded successfully within the Admin Shell.</p>
        </CardContent>
      </Card>
    </div>
  );
}
