import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudyTribesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Study Tribes</h1>
          <p className="text-sm text-slate-400">Departmental & course collaboration groups.</p>
        </div>
        <Badge variant="campus">Route: /study/tribes</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UniVerse ICOS — Study Tribes</CardTitle>
          <CardDescription>
            Foundation placeholder for peer study tribes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Current route successfully mounted within the Student Shell.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
