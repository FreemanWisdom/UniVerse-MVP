import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudyTutorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Tutor</h1>
          <p className="text-sm text-slate-400">Intelligent academic assistance.</p>
        </div>
        <Badge variant="campus">Route: /study/tutor</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UniVerse ICOS — AI Tutor</CardTitle>
          <CardDescription>
            Foundation placeholder for AI-guided tutoring.
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
