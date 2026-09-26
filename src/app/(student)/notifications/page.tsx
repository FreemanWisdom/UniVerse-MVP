import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-slate-400">Campus alerts and personal activity.</p>
        </div>
        <Badge variant="campus">Route: /notifications</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UniVerse ICOS — Notifications</CardTitle>
          <CardDescription>
            Foundation placeholder for in-app alerts and device pushes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Current route successfully mounted within the Student Shell. The existing Web Push and Edge Function notification pipeline remains intact in the backend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
