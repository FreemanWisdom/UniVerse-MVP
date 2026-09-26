import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUniversity,
  listCourses,
  listResources,
} from "@/services/study/study.service";

function StudyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Study Hub</h1>
        <p className="text-sm text-slate-400">Academic resources for your university.</p>
      </div>
      {children}
    </div>
  );
}

function StudyLoading() {
  return (
    <StudyState>
      <Card aria-busy="true" aria-label="Loading study resources">
        <CardContent className="p-6 text-sm text-slate-400">Loading Study resources…</CardContent>
      </Card>
    </StudyState>
  );
}

type StudyFoundationData =
  | { university: null; courses: []; resources: []; error: null }
  | { university: string; courses: Awaited<ReturnType<typeof listCourses>>; resources: Awaited<ReturnType<typeof listResources>>; error: null }
  | { university: null; courses: []; resources: []; error: string };

async function loadStudyFoundation(): Promise<StudyFoundationData> {
  const supabase = await createClient();

  try {
    const university = await getCurrentUniversity(supabase);
    if (!university) {
      return { university: null, courses: [], resources: [], error: null };
    }

    const [courses, resources] = await Promise.all([
      listCourses(supabase),
      listResources(supabase),
    ]);
    return { university, courses, resources, error: null };
  } catch (error) {
    return {
      university: null,
      courses: [],
      resources: [],
      error: error instanceof Error ? error.message : "Unable to load Study.",
    };
  }
}

async function StudyFoundation() {
  const { university, courses, resources, error } = await loadStudyFoundation();

  if (error) {
    return (
      <StudyState>
        <Card>
          <CardHeader><CardTitle>Study could not be loaded</CardTitle></CardHeader>
          <CardContent className="text-sm text-red-400" role="alert">{error}</CardContent>
        </Card>
      </StudyState>
    );
  }

  if (!university) {
    return (
      <StudyState>
        <Card>
          <CardHeader><CardTitle>Study is unavailable</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-400">
            Set your university in your profile to access campus study resources.
          </CardContent>
        </Card>
      </StudyState>
    );
  }

  return (
    <StudyState>
      <h2 className="text-sm font-medium text-slate-400">{university}</h2>
      <Card>
        <CardHeader><CardTitle>Courses</CardTitle></CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-slate-400">No courses are available yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-300">
              {courses.map((course) => <li key={course.id}>{course.course_title}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-slate-400">No study resources are available yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-300">
              {resources.map((resource) => <li key={resource.id}>{resource.title}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>
    </StudyState>
  );
}

export default function StudyPage() {
  return <Suspense fallback={<StudyLoading />}><StudyFoundation /></Suspense>;
}
