"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  countTribeMembers,
  createTribe,
  joinTribe,
  leaveTribe,
  listMyTribeIds,
  listTribes,
} from "@/services/study/tribes.service";
import { Tribe } from "@/features/study/tribes.types";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";
import { BackButton } from "@/components/back-button";
import { StudyNotice, StudySkeletonRows } from "@/features/study/components/study-ui";

interface CreateTribeFormState {
  name: string;
  description: string;
  courseCode: string;
  category: string;
  department: string;
  level: string;
}

const EMPTY_FORM: CreateTribeFormState = {
  name: "",
  description: "",
  courseCode: "",
  category: "",
  department: "",
  level: "",
};

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function StudyTribesPage() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [myTribeIds, setMyTribeIds] = useState<string[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number | null>>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinBusyIds, setJoinBusyIds] = useState<string[]>([]);
  const [tribeError, setTribeError] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateTribeFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setSearchQuery(searchInput),
      STUDY_CONSTANTS.SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestRef.current;

    const load = async () => {
      const supabase = createClient();

      setLoading(true);
      setError(null);

      try {
        const [nextTribes, nextMyIds] = await Promise.all([
          listTribes(supabase, {
            search: searchQuery.trim() || undefined,
          }),
          listMyTribeIds(supabase).catch(() => [] as string[]),
        ]);

        if (cancelled || requestId !== requestRef.current) return;

        setTribes(nextTribes);
        setMyTribeIds(nextMyIds);
        setHasMore(nextTribes.length === STUDY_CONSTANTS.TRIBE_PAGE_SIZE);

        // One lightweight HEAD count per visible tribe (no member rows fetched).
        nextTribes.forEach((tribe) => {
          void countTribeMembers(supabase, tribe.id)
            .then((count) => {
              if (!cancelled) {
                setMemberCounts((current) => ({ ...current, [tribe.id]: count }));
              }
            })
            .catch(() => {
              if (!cancelled) {
                setMemberCounts((current) => ({ ...current, [tribe.id]: null }));
              }
            });
        });
      } catch (loadError) {
        if (!cancelled && requestId === requestRef.current) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load Study Tribes.");
        }
      } finally {
        if (!cancelled && requestId === requestRef.current) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    const last = tribes[tribes.length - 1];
    if (!last) return;

    setLoadingMore(true);
    const supabase = createClient();

    try {
      const more = await listTribes(supabase, {
        search: searchQuery.trim() || undefined,
        cursor: { created_at: last.created_at, id: last.id },
      });

      setTribes((current) => {
        const seen = new Set(current.map((tribe) => tribe.id));
        return [...current, ...more.filter((tribe) => !seen.has(tribe.id))];
      });
      setHasMore(more.length === STUDY_CONSTANTS.TRIBE_PAGE_SIZE);

      more.forEach((tribe) => {
        void countTribeMembers(supabase, tribe.id)
          .then((count) => setMemberCounts((current) => ({ ...current, [tribe.id]: count })))
          .catch(() => setMemberCounts((current) => ({ ...current, [tribe.id]: null })));
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load more tribes.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleMembership = async (tribe: Tribe) => {
    const isMember = myTribeIds.includes(tribe.id);
    const supabase = createClient();

    setJoinBusyIds((current) => [...current, tribe.id]);
    setTribeError((current) => ({ ...current, [tribe.id]: "" }));

    setMyTribeIds((current) =>
      isMember
        ? current.filter((id) => id !== tribe.id)
        : sortByKey([...current, tribe.id])
    );
    setMemberCounts((current) => {
      const count = current[tribe.id];
      if (typeof count !== "number") return current;
      return { ...current, [tribe.id]: Math.max(0, count + (isMember ? -1 : 1)) };
    });

    try {
      if (isMember) {
        await leaveTribe(supabase, tribe.id);
      } else {
        await joinTribe(supabase, tribe.id);
      }
    } catch (toggleError) {
      setMyTribeIds((current) =>
        isMember
          ? sortByKey([...current, tribe.id])
          : current.filter((id) => id !== tribe.id)
      );
      setMemberCounts((current) => {
        const count = current[tribe.id];
        if (typeof count !== "number") return current;
        return { ...current, [tribe.id]: Math.max(0, count + (isMember ? 1 : -1)) };
      });
      setTribeError((current) => ({
        ...current,
        [tribe.id]: toggleError instanceof Error && toggleError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : `We couldn't ${isMember ? "remove you from" : "add you to"} this tribe. Please try again.`,
      }));
    } finally {
      setJoinBusyIds((current) => current.filter((id) => id !== tribe.id));
    }
  };

  const handleCreateTribe = async () => {
    setCreating(true);
    setFormError(null);
    const supabase = createClient();

    try {
      const tribe = await createTribe(supabase, {
        name: form.name,
        description: form.description || undefined,
        courseCode: form.courseCode || undefined,
        category: form.category || undefined,
        department: form.department || undefined,
        level: form.level || undefined,
      });

      setTribes((current) => [tribe, ...current]);
      setMyTribeIds((current) => sortByKey([...current, tribe.id]));
      setMemberCounts((current) => ({ ...current, [tribe.id]: 1 }));
      setForm(EMPTY_FORM);
      setShowCreate(false);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "";
      setFormError(
        message === "invalid_name"
          ? `Tribe name must be ${STUDY_CONSTANTS.TRIBE_NAME_MIN_LENGTH}-${STUDY_CONSTANTS.TRIBE_NAME_MAX_LENGTH} characters.`
          : message === "invalid_description"
            ? `Description must be ${STUDY_CONSTANTS.TRIBE_DESCRIPTION_MAX_LENGTH} characters or fewer.`
            : message === "no_university"
              ? "Set your university in your profile before creating a tribe."
              : message === "membership_failed"
                ? "Tribe created, but joining it as owner failed. Open the tribe and join it manually."
                : message === "session_expired"
                  ? "Your session expired. Please sign in again."
                  : "We couldn't create this tribe. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton href="/study" label="Back to Study" className="shrink-0" />
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">Study Tribes</h1>
          <span className="hidden truncate text-xs text-slate-500 md:inline">Departmental &amp; course collaboration groups</span>
        </div>
        <Button type="button" size="sm" onClick={() => setShowCreate((current) => !current)}>
          {showCreate ? "Cancel" : "Create tribe"}
        </Button>
      </div>

      {showCreate ? (
        <div className="space-y-3 rounded-lg border border-surface-200 bg-surface-50/30 p-3">
            <Input
              aria-label="Tribe name"
              placeholder="Tribe name"
              value={form.name}
              maxLength={STUDY_CONSTANTS.TRIBE_NAME_MAX_LENGTH}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              aria-label="Tribe description"
              placeholder="Description (optional)"
              value={form.description}
              maxLength={STUDY_CONSTANTS.TRIBE_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                aria-label="Course code"
                placeholder="Course code (optional)"
                value={form.courseCode}
                onChange={(event) => setForm((current) => ({ ...current, courseCode: event.target.value }))}
              />
              <Input
                aria-label="Category"
                placeholder="Category (optional)"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
              <Input
                aria-label="Department"
                placeholder="Department (optional)"
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />
            </div>
            <Input
              aria-label="Level"
              placeholder="Level (optional)"
              value={form.level}
              onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
            />
            {formError ? (
              <p className="text-sm text-red-400" role="alert">{formError}</p>
            ) : null}
            <Button type="button" size="sm" onClick={() => void handleCreateTribe()} disabled={creating}>
              {creating ? "Creating…" : "Create tribe"}
            </Button>
        </div>
      ) : null}

      <Input
        aria-label="Search study tribes"
        placeholder="Search tribes"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        className="h-9 max-w-xs text-xs"
      />

      {error ? (
        <StudyNotice tone="danger" role="alert">{error}</StudyNotice>
      ) : loading ? (
        <StudySkeletonRows count={3} />
      ) : tribes.length === 0 ? (
        <StudyNotice>
          {searchQuery.trim()
            ? "No tribes match your search."
            : "No tribes exist at your campus yet. Create the first one."}
        </StudyNotice>
      ) : (
        <>
          <div className="space-y-2">
            {tribes.map((tribe) => {
              const isMember = myTribeIds.includes(tribe.id);
              const memberCount = memberCounts[tribe.id];
              return (
                <div
                  key={tribe.id}
                  className="rounded-lg border border-surface-200 bg-surface-50/50 p-3 transition-colors hover:border-surface-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/study/tribes/${tribe.id}`}
                        className="text-sm font-medium text-foreground hover:text-campus-300"
                      >
                        {tribe.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-relaxed text-slate-500">
                        {tribe.course_code ? <span className="truncate">{tribe.course_code}</span> : null}
                        {tribe.category ? <span aria-hidden="true" className="text-surface-400">·</span> : null}
                        {tribe.category ? <span className="truncate">{tribe.category}</span> : null}
                        {tribe.department ? <span aria-hidden="true" className="text-surface-400">·</span> : null}
                        {tribe.department ? <span className="truncate">{tribe.department}</span> : null}
                        {tribe.level ? <span aria-hidden="true" className="text-surface-400">·</span> : null}
                        {tribe.level ? <span className="truncate">{tribe.level}</span> : null}
                        <span aria-hidden="true" className="text-surface-400">·</span>
                        <span>{memberCount === null ? "—" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}</span>
                        <span aria-hidden="true" className="text-surface-400">·</span>
                        <span>{formatDate(tribe.created_at)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isMember ? "outline" : "default"}
                      onClick={() => void handleToggleMembership(tribe)}
                      disabled={joinBusyIds.includes(tribe.id)}
                      aria-pressed={isMember}
                    >
                      {joinBusyIds.includes(tribe.id)
                        ? "…"
                        : isMember
                          ? "Leave"
                          : "Join"}
                    </Button>
                  </div>

                  {tribe.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">{tribe.description}</p>
                  ) : null}

                  {tribeError[tribe.id] ? (
                    <p className="mt-2 text-xs text-red-400" role="alert">{tribeError[tribe.id]}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more tribes"}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function sortByKey(items: string[]): string[] {
  return [...items].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
