"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  accessStudyResource,
  addStudyBookmark,
  enrollInCourse,
  getCurrentUniversity,
  leaveCourse,
  listBookmarkedResourceIds,
  listCourses,
  listEnrolledCourseIds,
  listResources,
  removeStudyBookmark,
} from "@/services/study/study.service";
import {
  StudyCourse,
  StudyResource,
  StudyFilterValue,
  StudyCourseFilterValue,
} from "@/features/study/study.types";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";
import { StudyResourceCard } from "@/features/study/components/study-resource-card";
import { StudyContributionPanel } from "@/features/study/components/study-contribution-panel";

const RESOURCE_TYPE_OPTIONS: Array<{ value: StudyFilterValue; label: string }> = [
  { value: "all", label: "All types" },
  { value: "material", label: "Material" },
  { value: "past_question", label: "Past question" },
  { value: "other", label: "Other" },
];

const COURSE_FILTER_ALL = "all";
const COURSE_FILTER_ENROLLED = "enrolled";

function StudyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}

function sortByKey<T>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

export default function StudyPage() {
  const [university, setUniversity] = useState<string | null>(null);
  const [universityResolved, setUniversityResolved] = useState(false);
  const [courses, setCourses] = useState<StudyCourse[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<StudyCourseFilterValue>(COURSE_FILTER_ALL);
  const [resourceType, setResourceType] = useState<StudyFilterValue>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [toggleSaveIds, setToggleSaveIds] = useState<string[]>([]);
  const [toggleEnrollIds, setToggleEnrollIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceError, setResourceError] = useState<Record<string, string>>({});
  const [courseError, setCourseError] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<Record<string, string>>({});
  const [accessingResourceId, setAccessingResourceId] = useState<string | null>(null);

  const resourceRequestId = useRef(0);

  // Debounce the search input: only the settled value triggers a refetch.
  useEffect(() => {
    const timer = setTimeout(
      () => setSearchQuery(searchInput),
      STUDY_CONSTANTS.SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Initial load: university, course library, bookmarks, enrollments — once.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();

      try {
        setLoading(true);
        setError(null);

        const [currentUniversity, nextCourses, bookmarkIds, enrolledIds] = await Promise.all([
          getCurrentUniversity(supabase),
          listCourses(supabase),
          listBookmarkedResourceIds(supabase).catch(() => [] as string[]),
          listEnrolledCourseIds(supabase).catch(() => [] as string[]),
        ]);

        if (cancelled) return;

        setUniversity(currentUniversity);
        setUniversityResolved(true);
        setCourses(nextCourses);
        setBookmarkedIds(sortByKey(bookmarkIds));
        setEnrolledCourseIds(sortByKey(enrolledIds));
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // The saved/enrolled sets only retrigger the resource fetch when the
  // corresponding filter is active; otherwise toggling a bookmark or an
  // enrollment must not refetch the list.
  const savedIdsKey = savedOnly ? bookmarkedIds.join(",") : "";
  const enrolledCourseCodes = selectedCourse === COURSE_FILTER_ENROLLED
    ? courses
        .filter((course) => enrolledCourseIds.includes(course.id))
        .map((course) => course.course_code)
    : [];
  const enrolledCodesKey = selectedCourse === COURSE_FILTER_ENROLLED
    ? sortByKey(enrolledCourseCodes).join(",")
    : "";

  // Resources: refetch page 1 whenever the filters change.
  useEffect(() => {
    if (!universityResolved || !university) return;

    let cancelled = false;
    const requestId = resourceRequestId.current + 1;
    resourceRequestId.current = requestId;

    // Re-snapshot the ids for this exact request so a toggle mid-flight
    // cannot skew the query.
    const resourceIds = savedOnly ? bookmarkedIds : undefined;
    const courseCodes = selectedCourse === COURSE_FILTER_ENROLLED
      ? courses
          .filter((course) => enrolledCourseIds.includes(course.id))
          .map((course) => course.course_code)
      : undefined;

    const load = async () => {
      const supabase = createClient();

      setResourcesLoading(true);

      try {
        const nextResources = await listResources(supabase, {
          courseCode: typeof selectedCourse === "string" &&
            selectedCourse !== COURSE_FILTER_ALL &&
            selectedCourse !== COURSE_FILTER_ENROLLED
            ? selectedCourse
            : undefined,
          courseCodes,
          resourceIds,
          resourceType: resourceType !== "all" ? resourceType : undefined,
          search: searchQuery.trim() || undefined,
        });

        if (cancelled || resourceRequestId.current !== requestId) return;

        setResources(nextResources);
        setHasMore(nextResources.length === STUDY_CONSTANTS.RESOURCE_PAGE_SIZE);
      } catch (loadError) {
        if (!cancelled && resourceRequestId.current === requestId) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load Study resources.");
        }
      } finally {
        if (!cancelled && resourceRequestId.current === requestId) {
          setResourcesLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedIdsKey/enrolledCodesKey stand in for the live sets
  }, [
    university,
    universityResolved,
    selectedCourse,
    resourceType,
    searchQuery,
    savedOnly,
    savedIdsKey,
    enrolledCodesKey,
  ]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    const last = resources[resources.length - 1];
    if (!last) return;

    setLoadingMore(true);
    const supabase = createClient();

    try {
      const more = await listResources(supabase, {
        courseCode: typeof selectedCourse === "string" &&
          selectedCourse !== COURSE_FILTER_ALL &&
          selectedCourse !== COURSE_FILTER_ENROLLED
          ? selectedCourse
          : undefined,
        courseCodes: selectedCourse === COURSE_FILTER_ENROLLED
          ? courses
              .filter((course) => enrolledCourseIds.includes(course.id))
              .map((course) => course.course_code)
          : undefined,
        resourceIds: savedOnly ? bookmarkedIds : undefined,
        resourceType: resourceType !== "all" ? resourceType : undefined,
        search: searchQuery.trim() || undefined,
        cursor: { created_at: last.created_at, id: last.id },
      });

      setResources((current) => {
        const seen = new Set(current.map((resource) => resource.id));
        return [...current, ...more.filter((resource) => !seen.has(resource.id))];
      });
      setHasMore(more.length === STUDY_CONSTANTS.RESOURCE_PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load more Study resources.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleSave = async (resource: StudyResource) => {
    const isSaved = bookmarkedIds.includes(resource.id);
    const supabase = createClient();

    setToggleSaveIds((current) => [...current, resource.id]);
    setSaveError((current) => ({ ...current, [resource.id]: "" }));

    // Optimistic update with rollback on failure.
    setBookmarkedIds((current) =>
      sortByKey(
        isSaved
          ? current.filter((id) => id !== resource.id)
          : [...current, resource.id]
      )
    );

    try {
      if (isSaved) {
        await removeStudyBookmark(supabase, resource.id);
      } else {
        await addStudyBookmark(supabase, resource.id);
      }
    } catch (toggleError) {
      setBookmarkedIds((current) =>
        sortByKey(
          isSaved
            ? sortByKey([...current, resource.id])
            : current.filter((id) => id !== resource.id)
        )
      );
      setSaveError((current) => ({
        ...current,
        [resource.id]: toggleError instanceof Error && toggleError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't update your saved resources. Please try again.",
      }));
    } finally {
      setToggleSaveIds((current) => current.filter((id) => id !== resource.id));
    }
  };

  const handleToggleEnrollment = async (course: StudyCourse) => {
    const isEnrolled = enrolledCourseIds.includes(course.id);
    const supabase = createClient();

    setToggleEnrollIds((current) => [...current, course.id]);
    setCourseError((current) => ({ ...current, [course.id]: "" }));

    // Optimistic update with rollback on failure.
    setEnrolledCourseIds((current) =>
      sortByKey(
        isEnrolled
          ? current.filter((id) => id !== course.id)
          : [...current, course.id]
      )
    );

    try {
      if (isEnrolled) {
        await leaveCourse(supabase, course.id);
      } else {
        await enrollInCourse(supabase, course.id);
      }
    } catch (toggleError) {
      setEnrolledCourseIds((current) =>
        sortByKey(
          isEnrolled
            ? sortByKey([...current, course.id])
            : current.filter((id) => id !== course.id)
        )
      );
      setCourseError((current) => ({
        ...current,
        [course.id]: toggleError instanceof Error && toggleError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't update your enrollment. Please try again.",
      }));
    } finally {
      setToggleEnrollIds((current) => current.filter((id) => id !== course.id));
    }
  };

  const handleResourceAction = async (resource: StudyResource, download: boolean) => {
    const supabase = createClient();
    setAccessingResourceId(resource.id);
    setResourceError((current) => ({ ...current, [resource.id]: "" }));

    try {
      const url = await accessStudyResource(supabase, resource.id, download);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = resource.title;
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

      setResourceError((current) => ({ ...current, [resource.id]: friendlyError }));
    } finally {
      setAccessingResourceId((current) => (current === resource.id ? null : current));
    }
  };

  if (error) {
    return (
      <StudyState>
        <Card>
          <CardContent className="p-6 text-sm text-red-400" role="alert">{error}</CardContent>
        </Card>
      </StudyState>
    );
  }

  if (!university && !loading) {
    return (
      <StudyState>
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-foreground">No university configured</p>
            <p className="text-sm text-slate-400">
              We couldn&#39;t determine your university. Set your university in your profile to use Study.
            </p>
          </CardContent>
        </Card>
      </StudyState>
    );
  }

  const filtersActive =
    selectedCourse !== COURSE_FILTER_ALL ||
    resourceType !== "all" ||
    savedOnly ||
    searchQuery.trim().length > 0;

  return (
    <StudyState>
      {loading ? (
        <Card aria-busy="true" aria-label="Loading study resources">
          <CardContent className="p-6 text-sm text-slate-400">Loading Study resources…</CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-400">{university}</h2>
            <div className="flex gap-2">
              <Link href="/study/tribes">
                <Button variant="outline" size="sm">Study Tribes</Button>
              </Link>
              <Link href="/study/tutor">
                <Button variant="outline" size="sm">AI Tutor</Button>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Course library</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                aria-label="Search study resources"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search study resources"
              />

              {courses.length === 0 ? (
                <p className="text-sm text-slate-400">No courses are available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(COURSE_FILTER_ALL)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedCourse === COURSE_FILTER_ALL ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                  >
                    All courses
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(COURSE_FILTER_ENROLLED)}
                    aria-pressed={selectedCourse === COURSE_FILTER_ENROLLED}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedCourse === COURSE_FILTER_ENROLLED ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                  >
                    My courses
                  </button>
                  {courses.map((course) => {
                    const isEnrolled = enrolledCourseIds.includes(course.id);
                    return (
                      <div key={course.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCourse(course.course_code)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedCourse === course.course_code ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                        >
                          {course.course_code}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleEnrollment(course)}
                          disabled={toggleEnrollIds.includes(course.id)}
                          aria-pressed={isEnrolled}
                          aria-label={isEnrolled ? `Leave ${course.course_code}` : `Enroll in ${course.course_code}`}
                          className={`rounded-full border px-2 py-1 text-[10px] font-medium ${isEnrolled ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-400"}`}
                        >
                          {toggleEnrollIds.includes(course.id) ? "…" : isEnrolled ? "Enrolled" : "Enroll"}
                        </button>
                        {courseError[course.id] ? (
                          <span className="text-[10px] text-red-400" role="alert">
                            {courseError[course.id]}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {university ? (
          <StudyContributionPanel
            university={university}
            onUploaded={(resource) => setResources((current) => [resource, ...current])}
            onDeleted={(resourceId) => {
              setResources((current) => current.filter((resource) => resource.id !== resourceId));
              setBookmarkedIds((current) => current.filter((id) => id !== resourceId));
            }}
          />
          ) : null}

          <Card>
            <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
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
                <button
                  type="button"
                  onClick={() => setSavedOnly((current) => !current)}
                  aria-pressed={savedOnly}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${savedOnly ? "border-campus-500 bg-campus-500/10 text-campus-300" : "border-surface-300 text-slate-300"}`}
                >
                  Saved
                </button>
              </div>

              {resourcesLoading && resources.length === 0 ? (
                <p className="text-sm text-slate-400" aria-live="polite">Loading resources…</p>
              ) : resources.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {filtersActive
                    ? "No resources match these filters."
                    : "No study resources for your campus yet — they're matched to your school. Upload the first one."}
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {resources.map((resource) => (
                      <StudyResourceCard
                        key={resource.id}
                        resource={resource}
                        isSaved={bookmarkedIds.includes(resource.id)}
                        isTogglingSave={toggleSaveIds.includes(resource.id)}
                        saveError={saveError[resource.id] || null}
                        accessBusy={accessingResourceId === resource.id}
                        accessError={resourceError[resource.id] || null}
                        onToggleSave={(target) => void handleToggleSave(target)}
                        onOpen={(target) => void handleResourceAction(target, false)}
                        onDownload={(target) => void handleResourceAction(target, true)}
                      />
                    ))}
                  </div>

                  {hasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadMore()}
                      disabled={loadingMore || resourcesLoading}
                    >
                      {loadingMore ? "Loading…" : "Load more resources"}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </StudyState>
  );
}
