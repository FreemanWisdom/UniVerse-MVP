"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  accessStudyResource,
  getCurrentUniversity,
  listCourses,
  listResources,
} from "@/services/study/study.service";
import {
  StudyCourse,
  StudyResource,
  StudyResourceType,
  StudyFilterValue,
  StudyCourseFilterValue,
} from "@/features/study/study.types";

const RESOURCE_TYPE_OPTIONS: Array<{ value: StudyFilterValue; label: string }> = [
  { value: "all", label: "All types" },
  { value: "material", label: "Material" },
  { value: "past_question", label: "Past question" },
  { value: "other", label: "Other" },
];

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

function formatDate(value: string | null): string {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Size unavailable";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudyPage() {
  const [university, setUniversity] = useState<string | null>(null);
  const [courses, setCourses] = useState<StudyCourse[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<StudyCourseFilterValue>("all");
  const [resourceType, setResourceType] = useState<StudyFilterValue>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceError, setResourceError] = useState<Record<string, string>>({});
  const [accessingResourceId, setAccessingResourceId] = useState<string | null>(null);

  const visibleCourses = useMemo(
    () => courses.filter((course) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [course.course_code, course.course_title, course.department ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    }),
    [courses, search]
  );

  useEffect(() => {
    let cancelled = false;

    const loadStudy = async () => {
      const supabase = createClient();

      try {
        setLoading(true);
        setError(null);

        const currentUniversity = await getCurrentUniversity(supabase);
        if (cancelled) return;

        setUniversity(currentUniversity);

        if (!currentUniversity) {
          setCourses([]);
          setResources([]);
          return;
        }

        const [nextCourses, nextResources] = await Promise.all([
          listCourses(supabase),
          listResources(supabase, {
            courseCode: selectedCourse !== "all" ? selectedCourse : undefined,
            resourceType: resourceType !== "all" ? resourceType : undefined,
            search: search.trim() || undefined,
          }),
        ]);

        if (!cancelled) {
          setCourses(nextCourses);
          setResources(nextResources);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load Study.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStudy();

    return () => {
      cancelled = true;
    };
  }, [resourceType, search, selectedCourse]);

  const handleResourceAction = async (resourceId: string, resourceTitle: string, download = false) => {
    const supabase = createClient();
    setAccessingResourceId(resourceId);
    setResourceError((current) => ({ ...current, [resourceId]: "" }));

    try {
      const url = await accessStudyResource(supabase, resourceId, download);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = resourceTitle;
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (actionError) {
      const friendlyError =
        actionError instanceof Error && actionError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : actionError instanceof Error && actionError.message === "not_available"
            ? "This resource is not available to your campus."
            : actionError instanceof Error && actionError.message === "file_unavailable"
              ? "This file is unavailable right now."
              : "We couldn't prepare this resource. Please try again.";

      setResourceError((current) => ({ ...current, [resourceId]: friendlyError }));
    } finally {
      setAccessingResourceId((current) => (current === resourceId ? null : current));
    }
  };

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

  if (!university && !loading) {
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
      {loading ? (
        <Card aria-busy="true" aria-label="Loading study resources">
          <CardContent className="p-6 text-sm text-slate-400">Loading Study resources…</CardContent>
        </Card>
      ) : (
        <>
          <h2 className="text-sm font-medium text-slate-400">{university}</h2>

          <Card>
            <CardHeader><CardTitle>Course library</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  aria-label="Filter courses"
                  value={selectedCourse}
                  onChange={(event) => setSelectedCourse(event.target.value)}
                  className="h-11 rounded-lg border border-surface-300 bg-surface-50 px-3 text-sm text-foreground"
                >
                  <option value="all">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.course_code}>{course.course_title}</option>
                  ))}
                </select>
                <Input
                  aria-label="Search courses"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search study resources"
                />
              </div>

              {visibleCourses.length === 0 ? (
                <p className="text-sm text-slate-400">No courses are available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCourse("all")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedCourse === "all" ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                  >
                    All courses
                  </button>
                  {visibleCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourse(course.course_code)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedCourse === course.course_code ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                    >
                      {course.course_code}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  aria-label="Filter resource type"
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value as StudyFilterValue)}
                  className="h-11 rounded-lg border border-surface-300 bg-surface-50 px-3 text-sm text-foreground"
                >
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {resources.length === 0 ? (
                <p className="text-sm text-slate-400">No study resources are available yet.</p>
              ) : (
                <div className="space-y-3">
                  {resources.map((resource) => (
                    <div key={resource.id} className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-foreground">{resource.title}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {resource.course_code ?? "General"} · {resource.resource_type}
                          </p>
                        </div>
                        <span className="rounded-full border border-surface-300 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                          {resource.file_type ?? resource.mime_type ?? "file"}
                        </span>
                      </div>

                      {resource.description ? (
                        <p className="mt-3 text-sm text-slate-300">{resource.description}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        {resource.category ? <span>{resource.category}</span> : null}
                        {resource.academic_year ? <span>· {resource.academic_year}</span> : null}
                        {resource.semester ? <span>· {resource.semester}</span> : null}
                        {resource.department ? <span>· {resource.department}</span> : null}
                        {resource.level ? <span>· {resource.level}</span> : null}
                        <span>· {formatDate(resource.created_at)}</span>
                        <span>· {formatSize(resource.file_size_bytes)}</span>
                        <span>· {resource.download_count} downloads</span>
                      </div>

                      {resourceError[resource.id] ? (
                        <p className="mt-3 text-sm text-red-400" role="alert">{resourceError[resource.id]}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleResourceAction(resource.id, resource.title, false)}
                          disabled={accessingResourceId === resource.id}
                        >
                          {accessingResourceId === resource.id ? "Opening…" : "Open"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleResourceAction(resource.id, resource.title, true)}
                          disabled={accessingResourceId === resource.id}
                        >
                          {accessingResourceId === resource.id ? "Preparing…" : "Download"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </StudyState>
  );
}
