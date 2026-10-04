import { SupabaseClient } from "@supabase/supabase-js";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";
import { StudyCursor } from "@/features/study/study.types";
import {
  CreateTribeInput,
  ListTribePostsParams,
  ListTribesParams,
  Tribe,
  TribeJoinRequest,
  TribeJoinRequestsResult,
  TribePost,
} from "@/features/study/tribes.types";
import { getCurrentUniversity } from "@/services/study/study.service";

// Public-safe projections only. Never add creator_id to TRIBE_COLUMNS or
// author_id to TRIBE_POST_COLUMNS: those columns must not reach the client.
const TRIBE_COLUMNS =
  "id, name, description, course_code, department, level, category, created_at";
const TRIBE_POST_COLUMNS = "id, content, created_at";

function escapeFilterValue(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

function applyDescCursor<T>(query: T, cursor?: StudyCursor): T {
  if (!cursor) return query;

  const createdAt = cursor.created_at.replace(/"/g, "");
  const id = cursor.id.replace(/"/g, "");
  return (query as { or: (filters: string) => T }).or(
    `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt."${id}")`
  );
}

function applyAscCursor<T>(query: T, cursor?: StudyCursor): T {
  if (!cursor) return query;

  const createdAt = cursor.created_at.replace(/"/g, "");
  const id = cursor.id.replace(/"/g, "");
  return (query as { or: (filters: string) => T }).or(
    `created_at.gt."${createdAt}",and(created_at.eq."${createdAt}",id.gt."${id}")`
  );
}

async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("session_expired");
  }

  return user.id;
}

// --- Tribe browsing ---------------------------------------------------------
// RLS scopes reads to same-campus, active-moderation tribes.

export async function listTribes(
  supabase: SupabaseClient,
  { search, cursor }: ListTribesParams = {}
): Promise<Tribe[]> {
  let query = supabase
    .from("tribes")
    .select(TRIBE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  const searchTerm = search ? escapeFilterValue(search) : "";
  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,course_code.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
    );
  }

  const { data, error } = await applyDescCursor(query, cursor).limit(
    STUDY_CONSTANTS.TRIBE_PAGE_SIZE
  );

  if (error) {
    throw new Error(`Unable to load Study Tribes: ${error.message}`);
  }

  return data as Tribe[];
}

export async function getTribe(
  supabase: SupabaseClient,
  tribeId: string
): Promise<Tribe | null> {
  const { data, error } = await supabase
    .from("tribes")
    .select(TRIBE_COLUMNS)
    .eq("id", tribeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load this tribe: ${error.message}`);
  }

  return data as Tribe | null;
}

// --- Membership ------------------------------------------------------------

export async function listMyTribeIds(supabase: SupabaseClient): Promise<string[]> {
  const userId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("tribe_members")
    .select("tribe_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to load your tribes: ${error.message}`);
  }

  return (data ?? []).map((row) => row.tribe_id as string);
}

// --- Join requests (creator approval) ---------------------------------------
// Joining is no longer instant: the student files a request, the tribe
// creator accepts or declines. Decline deletes the row; a former member
// re-requesting resets their old accepted row to pending.

export async function requestTribeJoin(
  supabase: SupabaseClient,
  tribeId: string
): Promise<void> {
  const userId = await getCurrentUserId(supabase);

  // Upsert (not insert-only): a former member whose accepted row still
  // exists gets it reset to pending so they can rejoin after leaving.
  const { error } = await supabase.from("tribe_join_requests").upsert(
    { tribe_id: tribeId, user_id: userId, status: "pending" },
    { onConflict: "tribe_id,user_id" }
  );

  if (error) {
    throw new Error(`Unable to send your join request: ${error.message}`);
  }
}

export async function cancelTribeJoinRequest(
  supabase: SupabaseClient,
  tribeId: string
): Promise<void> {
  const { error } = await supabase
    .from("tribe_join_requests")
    .delete()
    .eq("tribe_id", tribeId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Unable to cancel your join request: ${error.message}`);
  }
}

export async function listMyJoinRequestTribeIds(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tribe_join_requests")
    .select("tribe_id")
    .eq("user_id", (await getCurrentUserId(supabase)))
    .eq("status", "pending");

  if (error) {
    // New table; treat unavailable as "no pending requests" rather than
    // breaking the whole page.
    return [];
  }

  return (data ?? []).map((row) => row.tribe_id as string);
}

// Creator side. The RPC gates on creator and joins names server-side,
// so creator_id never reaches the client.
export async function listTribeJoinRequests(
  supabase: SupabaseClient,
  tribeId: string
): Promise<TribeJoinRequestsResult> {
  const { data, error } = await supabase.rpc("tribe_list_join_requests", {
    p_tribe_id: tribeId,
  });

  if (error) {
    throw new Error(`Unable to load join requests: ${error.message}`);
  }

  return (data ?? { is_creator: false, requests: [] }) as TribeJoinRequestsResult;
}

export async function acceptTribeJoinRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<void> {
  const { error } = await supabase.rpc("tribe_accept_join_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`Unable to accept this request: ${error.message}`);
  }
}

export async function declineTribeJoinRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("tribe_join_requests")
    .delete()
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Unable to decline this request: ${error.message}`);
  }
}

export async function leaveTribe(
  supabase: SupabaseClient,
  tribeId: string
): Promise<void> {
  const { error } = await supabase
    .from("tribe_members")
    .delete()
    .eq("tribe_id", tribeId);

  if (error) {
    throw new Error(`Unable to leave this tribe: ${error.message}`);
  }
}

export async function countTribeMembers(
  supabase: SupabaseClient,
  tribeId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("tribe_members")
    .select("*", { count: "exact", head: true })
    .eq("tribe_id", tribeId);

  if (error) {
    throw new Error(`Unable to count tribe members: ${error.message}`);
  }

  return count ?? 0;
}

// --- Tribe creation --------------------------------------------------------
// RLS: creator_id must be auth.uid() and university must match the
// creator's profile. No backend trigger assigns the owner membership,
// so the frontend inserts it as a second step (known non-atomicity).

export async function createTribe(
  supabase: SupabaseClient,
  input: CreateTribeInput
): Promise<Tribe> {
  const userId = await getCurrentUserId(supabase);
  const university = await getCurrentUniversity(supabase);

  if (!university) {
    throw new Error("no_university");
  }

  const name = input.name.trim();
  if (
    name.length < STUDY_CONSTANTS.TRIBE_NAME_MIN_LENGTH ||
    name.length > STUDY_CONSTANTS.TRIBE_NAME_MAX_LENGTH
  ) {
    throw new Error("invalid_name");
  }
  if (
    input.description &&
    input.description.length > STUDY_CONSTANTS.TRIBE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error("invalid_description");
  }

  const { data, error } = await supabase
    .from("tribes")
    .insert({
      name,
      description: input.description?.trim() || null,
      course_code: input.courseCode?.trim() || null,
      department: input.department?.trim() || null,
      level: input.level?.trim() || null,
      category: input.category?.trim() || null,
      university,
      creator_id: userId,
    })
    .select(TRIBE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Unable to create this tribe: ${error.message}`);
  }

  const tribe = data as Tribe;

  const { error: memberError } = await supabase.from("tribe_members").insert({
    tribe_id: tribe.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    // The tribe exists but the creator membership failed; surface a
    // distinct, actionable failure.
    throw new Error("membership_failed");
  }

  return tribe;
}

// --- Tribe posts ------------------------------------------------------------
// RLS scopes reads to posts of tribes the user belongs to (active only).
// The INSERT policy also enforces admin.user_allowed(uid, 'post').

export async function listTribePosts(
  supabase: SupabaseClient,
  tribeId: string,
  { cursor }: ListTribePostsParams = {}
): Promise<TribePost[]> {
  let query = supabase
    .from("tribe_posts")
    .select(TRIBE_POST_COLUMNS)
    .eq("tribe_id", tribeId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const { data, error } = await applyAscCursor(query, cursor).limit(
    STUDY_CONSTANTS.TRIBE_POST_PAGE_SIZE
  );

  if (error) {
    throw new Error(`Unable to load tribe posts: ${error.message}`);
  }

  return data as TribePost[];
}

/**
 * Ids of the user's own posts in a tribe. Queried with an author_id filter
 * so other users' author ids are never fetched to the client.
 */
export async function listMyTribePostIds(
  supabase: SupabaseClient,
  tribeId: string
): Promise<string[]> {
  const userId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("tribe_posts")
    .select("id")
    .eq("tribe_id", tribeId)
    .eq("author_id", userId);

  if (error) {
    throw new Error(`Unable to load your posts: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id as string);
}

export async function createTribePost(
  supabase: SupabaseClient,
  tribeId: string,
  content: string
): Promise<TribePost> {
  const userId = await getCurrentUserId(supabase);

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > STUDY_CONSTANTS.TRIBE_POST_MAX_LENGTH) {
    throw new Error("invalid_content");
  }

  const { data, error } = await supabase
    .from("tribe_posts")
    .insert({ tribe_id: tribeId, author_id: userId, content: trimmed })
    .select(TRIBE_POST_COLUMNS)
    .single();

  if (error) {
    // The INSERT policy also enforces admin.user_allowed(uid, 'post'):
    // lockdowns or active restrictions surface as a policy violation.
    throw new Error(error.code === "42501" ? "posting_not_allowed" : "post_failed");
  }

  return data as TribePost;
}

export async function deleteTribePost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase.from("tribe_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(`Unable to delete this post: ${error.message}`);
  }
}
