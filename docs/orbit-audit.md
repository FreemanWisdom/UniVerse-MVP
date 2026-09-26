# UniVerse ICOS — Phase 4B Orbit Audit

**Audit mode:** Audit only. No Orbit application, database, SQL, policy, Storage, Realtime, or configuration changes were made.

**Repository:** `UniVerse-MVP`

**Branch requested:** `my-new-feature`

**Primary evidence inspected:** `dashboard.html`, `icos-enhancements.js`, `index.html`, `mobile-app.css`, `push_notifications.sql`, `NOTIFICATIONS_SETUP.md`, `manifest.json`, `notifications-sw.js`, `send-push.ts`, current `src/` tree, `proxy.ts`, package metadata, and repository-wide search results.

**Evidence labels used in this report:**

- **CONFIRMED FROM REPOSITORY** — directly visible in repository code or markup.
- **INFERRED FROM LEGACY CODE** — behavior inferred from how the legacy client calls Supabase or renders state; it still does not prove current database policy/schema behavior.
- **UNVERIFIED — REQUIRES SUPABASE VERIFICATION** — cannot be established safely from repository evidence alone.

---

## 1. Executive Summary

The legacy Orbit experience is implemented inline in `dashboard.html`, primarily in the `Orbit-only product logic` block beginning around line 4209. It is an authenticated, campus-scoped social feed backed directly by Supabase client queries. The feed reads active, campus-visible rows from `orbit_feed`, scoped by the authenticated user's `profiles.university` value via the post `school_tag` column. It supports cursor pagination, client-side search and ranking modes, post creation with up to ten images, likes, saves, comments with parent IDs, mentions, profile views, reports, notifications, and a single Supabase Realtime channel.

The legacy code is substantially more complete than a placeholder: it has optimistic interaction handling, duplicate-event suppression, cleanup for orphaned image uploads after a failed post insert, comment pagination, profile hydration, and targeted notification handling. However, the implementation is a large global script with direct DOM manipulation and client-managed state. It performs several batched-but-repeated queries, uses public URLs for Orbit images without proving bucket visibility, and relies on database RLS/constraints/triggers that are not defined in the repository.

The most important architectural finding is that the repository demonstrates client intent, not authoritative backend authorization. The next implementation must preserve the observed columns and operation shapes but must verify actual table definitions, foreign keys, uniqueness constraints, RLS, Storage policies, Realtime publication, and notification triggers against the live Supabase project before code is written.

`icos-enhancements.js` does not implement Orbit. Its matching references are Study Tribes and shared styling; Orbit behavior is in `dashboard.html`. `index.html` contains only the public conceptual Orbit presentation and auth entry point, not feed data access.

---

## 2. Legacy Orbit Behavior

### 2.1 Feed

**CONFIRMED FROM REPOSITORY**

- Orbit is rendered in `dashboard.html` under `#orbitPage`.
- The UI includes:
  - campus heading and university label;
  - search input for posts, people, or hashtags;
  - composer entry point;
  - `For You`, `Latest`, and `Trending` tabs;
  - a new-posts banner;
  - feed container.
- `init()` calls `loadFeed(true)` only after Supabase Auth session resolution and current profile resolution.
- No session causes a redirect to `index.html`.
- The profile row is treated as the authoritative campus identity for Orbit; `profiles.university` is copied into `userUniversity`.
- Feed query:
  - table: `orbit_feed`;
  - selected columns: `id,content,images,school_tag,poster_name,poster_id,created_at,updated_at,edited_at,status,visibility`;
  - filters: `school_tag = userUniversity`, `status = active`, `visibility = campus`;
  - ordering: `created_at DESC`, then `id DESC`;
  - page size: `FEED_PAGE_SIZE`, confirmed as `20`;
  - cursor condition after the first page: rows older than the last `(created_at, id)` pair.
- Pagination is implemented as an explicit `Load more` button, not infinite scroll. The button is rendered while `orbitFeedLoadedAll` is false and search is empty.
- Loading state is two Orbit skeleton blocks inserted before the first/reset request.
- Empty state distinguishes no search results from an otherwise quiet feed.
- Initial feed errors render a retry button. Later errors are logged and do not replace already-rendered posts.
- Search is client-side over already-loaded posts. It is debounced by `280ms`, lowercases the query, strips one leading `@` or `#`, and matches `poster_name` or `content`. Search does not query Supabase.
- Search disables the load-more button because rendering omits it when `orbitState.search` is set. This means search only covers the loaded local set, not the full campus feed.
- The code maintains an in-memory `Map` of posts and does not use a persistent cache or browser storage cache for Orbit data.
- Realtime inserts can appear immediately at the top when the user is near the top of the page; otherwise they accumulate in `newPosts` and show a banner until the user explicitly loads them.

**INFERRED FROM LEGACY CODE**

- The intended default feed is campus-only, not global. The exact meaning and normalization rules of `school_tag` versus `profiles.university` are not guaranteed by the client.
- `For You` is a client-side score ordering, not a server-side personalized query. The score combines likes and comments with age; the formula is `((likes * 3) + (comments * 5)) / ageHours^0.65`, then the default mode blends score and timestamp.
- `Trending` and `Latest` operate only over the currently loaded in-memory posts. They are not independent database feeds.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether unauthenticated reads are blocked by RLS.
- Whether the database enforces valid `status` and `visibility` values.
- Whether `school_tag` is constrained to a school/profile value or is merely client-supplied text.
- Whether feed row ordering is indexed for the cursor query.
- Whether `id` is UUID, another sortable type, or otherwise safe as the tie-breaker used by the client.

### 2.2 Creating posts

**CONFIRMED FROM REPOSITORY**

- The composer is available after the authenticated dashboard has initialized.
- A post must contain text or at least one selected image. The browser rejects an entirely empty submission.
- Textarea has `maxlength="5000"`; the submit function trims content before insert.
- Up to ten selected files are retained in `selectedFiles`; repeated file selection appends and is capped with `.slice(0,10)`.
- Files are previewed locally with `FileReader`.
- The file input accepts `image/*` and has `multiple` enabled.
- Each selected file is checked in JavaScript for:
  - MIME type beginning with `image/`;
  - size no greater than `10 * 1024 * 1024` bytes.
- Upload occurs before post creation, sequentially, one file at a time.
- Bucket referenced: `orbit-images`.
- Object path shape:
  - `${currentUserId}/${crypto.randomUUID()}_${sanitizedOriginalName}`;
  - filename characters outside `[a-zA-Z0-9._-]` are replaced with `_`.
- After each upload, the client calls `getPublicUrl(path)` and stores the resulting URL in the post `images` value.
- Post insert payload is:
  - `content`;
  - `images` (array of public URLs);
  - `school_tag: userUniversity`;
  - `poster_name: userFullName`;
  - `poster_id: currentUserId`.
- Insert requests one row and selects `ORBIT_POST_COLUMNS` with `.single()`.
- After success, the new post is added to the local state with zeroed local social counts/state and rendered.
- Mentions are inserted after the post row is created.
- If the post insert fails after uploads, the client attempts to remove every uploaded object from `orbit-images`.
- If mention insertion fails, the client logs a warning but keeps the post.
- The modal displays “Campus-only • The Orbit” and the UI copy says `#hashtags and @mentions supported`.

**INFERRED FROM LEGACY CODE**

- The intended author is the authenticated user, and the intended campus is the current profile's university.
- The client expects multiple image URLs in the `images` column, but the exact database type is not confirmed.
- The client attempts a compensating cleanup for upload-before-insert failure, but cleanup is best-effort and cannot prove complete orphan prevention.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether only authenticated users can insert posts.
- Whether RLS forces `poster_id = auth.uid()` and prevents spoofing `poster_name` or `school_tag`.
- Whether server defaults/triggers overwrite or validate author/campus fields.
- Whether the database has a hard text length constraint beyond the browser's 5000-character limit.
- Whether `images` accepts a URL array and whether it has a maximum number/length.
- Whether Storage enforces MIME type and 10 MB limits; browser checks alone are not authorization or resource protection.
- Whether the public URL remains valid if the bucket is private or policy changes.
- What happens if the post succeeds but mention insertion fails: the client deliberately leaves the post without retrying mentions.
- What happens if Storage upload succeeds but cleanup fails: the client only logs the cleanup failure and may leave an orphan.
- Whether database triggers create notifications on post creation; repository SQL explicitly says it does not notify every campus user for every new post.

### 2.3 Editing and deleting posts

**CONFIRMED FROM REPOSITORY**

- The post menu shows edit/delete only when `p.poster_id === currentUserId` in the browser.
- Edit is text-only through `prompt()`. It refuses an empty edited body when there are no images.
- Edit performs an optimistic local content/edited timestamp update, then executes:
  - `orbit_feed.update({content}).eq('id', id).eq('poster_id', currentUserId).select(ORBIT_POST_COLUMNS).single()`.
- Delete removes the post optimistically and executes:
  - `orbit_feed.delete().eq('id', id).eq('poster_id', currentUserId)`.
- Failed edit/delete operations restore the prior in-memory post and show a basic alert.
- There is no legacy UI for replacing/removing individual post images during edit.

**INFERRED FROM LEGACY CODE**

- The client expects ownership checks to be enforced by both UI filtering and the `.eq(...poster_id...)` mutation filters.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether RLS independently enforces owner-only update/delete.
- Whether deleting a post cascades/soft-deletes comments, likes, saves, mentions, and media references.
- Whether `deleted_at` or another moderation/deletion mechanism exists for posts; the Orbit feed client uses `status` but does not itself implement soft deletion.

### 2.4 Post display

**CONFIRMED FROM REPOSITORY**

- Author display uses `poster_name` from `orbit_feed`, then hydrates `profiles` for `full_name` and `avatar_url`.
- The header displays author, `school_tag` (falling back to `userUniversity`), relative time, and an `edited` indicator when `edited_at` is truthy.
- Avatar uses a profile URL when available, otherwise initials derived from the display name.
- Text is escaped before rendering; `#hashtags` and `@mentions` are visually highlighted by a client regex. This does not create links or prove stored mention semantics.
- Images are rendered from `images` values after URL validation. One through four images have different grid layouts; more than four displays a `+N` overlay on the fourth tile.
- Images open in a fullscreen viewer with previous/next controls.
- Actions include like count, “See likes”, comment count, share, and save.
- Post menu includes edit/delete for own posts and share/report for other users' posts, plus save for all posts.
- The display includes campus metadata through `school_tag`.
- Verified indicators and moderation indicators are not shown on ordinary post cards. Verification is shown on public profile cards when `profiles.is_verified` is true.
- No post-specific moderation badge is rendered.

### 2.5 Likes

**CONFIRMED FROM REPOSITORY**

- Initial social hydration loads all like rows for the current page:
  - `orbit_post_likes.select('post_id,user_id').in('post_id', ids)`.
- Like count and current-user state are computed client-side from those rows.
- Like insert payload: `{post_id: id, user_id: currentUserId}`.
- Like delete filters by both `post_id` and `user_id`.
- The UI is optimistic: local count/state changes immediately, then the result is reconciled with:
  - an exact head count query for the post;
  - a `maybeSingle()` query for the current user's like row.
- Failed likes roll back local state and log the error; there is no visible user-facing error message in this function.
- The “See likes” view queries `user_id,created_at` for a post, orders newest first, then performs one profile query for all liker IDs.
- A local `pendingLikes` map and Realtime handler attempt to prevent duplicate application of the current user's own event.

**INFERRED FROM LEGACY CODE**

- The intended user can like/unlike any campus-visible post, subject to backend policy.
- The UI expects one like row per user/post because it treats `maybeSingle()` as the current state and increments/decrements counts as individual row events.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether `(post_id,user_id)` has a unique constraint preventing duplicate likes.
- Whether RLS permits authenticated users to insert/delete only their own like rows.
- Whether users may like posts outside their campus if they know the ID.
- Whether database triggers notify post owners, although `push_notifications.sql` explicitly defines an Orbit-like trigger.

### 2.6 Saves

**CONFIRMED FROM REPOSITORY**

- Initial hydration loads only the current user's saves for the current page:
  - `orbit_post_saves.select('post_id').in('post_id', ids).eq('user_id', currentUserId)`.
- Save insert payload: `{post_id:id,user_id:currentUserId}`.
- Save deletion filters by `post_id` and `user_id`.
- Save UI is optimistic, with local rollback on failure.
- The client re-queries the user's save row with `maybeSingle()` after mutation.
- Realtime subscribes to saves filtered by the current user and updates the local saved state.
- No saved-posts page/view is implemented in the Orbit code shown.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether `(post_id,user_id)` is unique.
- Whether RLS permits only self-owned save rows and prevents cross-campus access.
- Whether save rows cascade when posts are deleted.
- Whether saves need Realtime at all; the legacy client uses it, but save state is private to the current user and could be reconciled on demand.

### 2.7 Comments

**CONFIRMED FROM REPOSITORY**

- Comments load lazily when a post's comment section opens.
- Query:
  - `orbit_comments.select('id,post_id,user_id,parent_comment_id,content,created_at,updated_at')`;
  - `post_id = id`;
  - `deleted_at IS NULL`;
  - order `created_at DESC`, `id DESC`;
  - limit `ORBIT_COMMENT_PAGE_SIZE + 1`, with page size confirmed as `25`.
- Cursor pagination uses the last loaded `(created_at,id)` pair.
- The returned page is reversed for display and merged into a local map, then sorted ascending by `created_at`.
- UI provides `Load more comments` when another page exists.
- Comment insert payload includes a client UUID:
  - `id`, `post_id`, `user_id`, `content`, `parent_comment_id`.
- Browser validates only non-empty text and a maximum of 1000 characters through the input's `maxlength` and JS check.
- New comments are optimistic and roll back on failure.
- Replies are represented by `parent_comment_id`; however, rendering is a flat list and does not nest replies.
- Users can delete their own comments in the UI. The delete request filters by comment ID and current user ID.
- Comment count is hydrated by selecting only `post_id` for non-deleted rows across the feed page.
- The empty state says no comments yet; comment-load failures are logged and do not display a dedicated error state inside the comment section.

**INFERRED FROM LEGACY CODE**

- Parent comments are intended to be supported at the data level, but the current visual structure does not implement threaded rendering.
- `deleted_at` is treated as the visibility filter, but the delete mutation does not set it directly, so either the legacy database uses hard delete or another trigger/RPC behavior is involved.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether `parent_comment_id` has a self-referential foreign key and whether cross-post parents are prevented.
- Whether comment delete is hard delete and whether moderators can delete comments.
- Whether comment insert/update/delete RLS is owner-only or broader.
- Whether comment counts should exclude deleted rows through a view or only client-side filtering.
- Whether replies are intended to notify parent commenters; repository notification SQL only shows post-owner comment notification.

### 2.8 Mentions

**CONFIRMED FROM REPOSITORY**

- Mention autocomplete exists for posts, not comments.
- The composer recognizes a trailing `@...` query after whitespace and debounces suggestion loading by `160ms`.
- Suggestions query up to 250 profiles on the same `university`, excluding the current user, selecting `id,full_name,avatar_url,university,department,level`.
- It also loads up to 1000 active campus post IDs and queries the current user's likes/comments on those posts to rank profile suggestions by engagement with their posts.
- The UI filters suggestions by `full_name`, sorts by engagement then name, and displays up to eight.
- Inserting a suggestion replaces the current `@` token with `@Full Name` and stores the selected profile ID/name in `orbitComposerMentions`.
- On post creation, selected mentions are validated against the post content with a case-insensitive exact-name regex and inserted into `orbit_post_mentions` as `{post_id,mentioned_user_id}`.
- Mention storage occurs only after post creation; failed mention insertion is logged and does not fail the post.
- Post and comment text visually highlights `@tokens`, but display does not look up mention records.
- Public profile view queries `orbit_post_mentions` by `mentioned_user_id`, retrieves associated active campus posts, and renders a Tagged section.
- `push_notifications.sql` defines an `orbit_post_mentions` trigger that creates `orbit_mention` notifications for mentioned users.

**INFERRED FROM LEGACY CODE**

- Mentions are intended to be campus-scoped through profile suggestion filtering and the post's campus filter.
- Notifications for mentions are expected to be database-triggered, not client-created.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether `orbit_post_mentions` has uniqueness preventing duplicate mentions per post/user.
- Whether mention RLS restricts inserts to the post author and restricts reads to appropriate users.
- Whether an inserted `mentioned_user_id` must belong to the same university as the post.
- Whether comments are intended to support stored mentions; no repository implementation was found.
- Whether deleting a post cascades mention rows and associated notifications.

### 2.9 Notifications related to Orbit

**CONFIRMED FROM REPOSITORY**

- Orbit reads the existing `notifications` table for the current user.
- Unread badge query: exact count of rows where `user_id = currentUserId` and `is_read = false`.
- Notification list query selects `id,type,actor_id,title,body,link,is_read,created_at`, filters by current user, orders newest first, and limits to 100.
- Actor profiles are hydrated in one `profiles` query.
- UI maps `orbit_like`, `orbit_comment`, and `orbit_mention` to different icons.
- Clicking a notification updates `is_read = true` filtered by notification ID and current user ID.
- Links beginning with `#orbit-post-` close the modal and scroll to the loaded post if present.
- The same Realtime channel listens for current-user notification inserts and refreshes the badge/list; device push handling is also invoked.
- `push_notifications.sql` visibly defines triggers for Orbit likes, comments, and mentions and writes notification fields `user_id,type,actor_id,title,body,link,is_read,created_at`.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Current production notification table definition and all notification type values.
- Whether notification read updates are authorized only for the recipient.
- Whether all current production triggers match the checked-in SQL; the SQL file is repository evidence, not proof of current deployment.
- Whether notification rows are deduplicated or can be generated repeatedly.

---

## 3. Backend Contract

This section records every Orbit-related table/field/query/mutation directly observed. It does not claim that the listed columns are the complete live schema.

### 3.1 `orbit_feed`

**Purpose observed:** campus feed post rows.

**Columns observed in repository:**

- `id`
- `content`
- `images`
- `school_tag`
- `poster_name`
- `poster_id`
- `created_at`
- `updated_at`
- `edited_at`
- `status`
- `visibility`

**Primary-key assumptions:** `id` is used as a row identifier and cursor tie-breaker. Exact type and primary-key constraint are **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Foreign-key assumptions:** `poster_id` is treated as a profile/user identifier. A formal foreign key to `profiles` or `auth.users` is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Relationships observed:**

- Feed rows are matched to `profiles` by `poster_id`.
- `orbit_post_likes`, `orbit_post_saves`, `orbit_comments`, and `orbit_post_mentions` are matched by `post_id`.
- `push_notifications.sql` looks up `poster_id` as the owner for like/comment notifications.

**Queries used:**

- Campus feed page query with active/campus filters and cursor ordering.
- Profile posts query by `poster_id`, with same campus/status/visibility filters.
- Tagged post lookup by `id IN (...)`, with same campus/status/visibility filters.
- Mention suggestion helper query selecting `id,poster_id` for active campus posts, limited to 1000.
- Realtime subscription for all events.

**Mutations used:**

- Insert post with content/images/school_tag/poster_name/poster_id, followed by select.
- Update content by ID and poster ID, followed by select.
- Delete by ID and poster ID.

**Ordering/filtering/pagination:**

- Main feed: `school_tag`, `status`, `visibility`; descending `created_at`, descending `id`; page size 20; keyset-style cursor.
- Profile posts: `poster_id`, same campus/status/visibility; descending `created_at`; no explicit pagination.
- Tagged posts: IDs from mention rows, same campus/status/visibility; descending `created_at`; max mention query limit 200 but no post query limit.

**Security assumptions:** UI and mutation filters imply owner/campus restrictions, but backend enforcement is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Realtime usage:** one channel subscribes to all events, with client-side campus filtering.

**Unverified details:** complete schema, defaults, check constraints, indexes, foreign keys, RLS, triggers, soft-delete semantics, and whether `images` is JSON/array/text.

### 3.2 `orbit_comments`

**Purpose observed:** comments associated with Orbit posts.

**Columns observed in repository:**

- `id`
- `post_id`
- `user_id`
- `parent_comment_id`
- `content`
- `created_at`
- `updated_at`
- `deleted_at` (filtered/read; not inserted/updated by Orbit client)

**Primary-key assumptions:** `id` is used as a unique comment identifier and client-generated UUID on insert. Exact type/default is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Foreign-key assumptions:** `post_id` points to `orbit_feed.id`; `user_id` points to a user/profile; `parent_comment_id` may point to another comment. All are **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Relationships observed:** joined to posts by `post_id`, profiles by `user_id`.

**Queries used:** count hydration by post IDs, paged comment reads by post, and mention-suggestion engagement queries by current user.

**Mutations used:** insert with client UUID; delete by ID and current user ID.

**Ordering/filtering/pagination:** non-deleted rows only; descending database order, reversed for display; page size 25; keyset cursor.

**Security assumptions:** client checks own-user deletion and sends own `user_id` on insert, but RLS is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Realtime usage:** all events on the shared `orbit-live-${currentUserId}` channel; no table filter beyond table name.

**Unverified details:** hard versus soft delete, reply constraints, moderation access, indexes, and notification behavior for replies.

### 3.3 `orbit_post_likes`

**Purpose observed:** one user's reaction to a post.

**Columns observed:** `post_id`, `user_id`, `created_at`.

**Primary-key/unique assumptions:** a user/post uniqueness constraint is expected by `maybeSingle()` and count logic but is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Relationships observed:** `post_id` to `orbit_feed`, `user_id` to profile/auth identity.

**Queries used:** page-level all-like hydration; current-user save-like state; exact count; liker list ordered by `created_at`; mention suggestion engagement; notification trigger lookup.

**Mutations used:** insert `{post_id,user_id}` and delete filtered by both.

**Ordering/filtering/pagination:** liker list newest first; no explicit pagination for likes or liker list.

**Security assumptions:** authenticated self-like behavior and post access are inferred only. RLS/constraints are **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Realtime usage:** all events, client-side post lookup and optimistic-event suppression.

**Unverified details:** primary key, unique index, cascade behavior, and production notification trigger deployment.

### 3.4 `orbit_post_saves`

**Purpose observed:** current user's saved post state.

**Columns observed:** `post_id`, `user_id`.

**Primary-key/unique assumptions:** one save per user/post is expected but **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Relationships observed:** `post_id` to `orbit_feed`, `user_id` to user/profile.

**Queries used:** page-level current-user hydration and post-level reconciliation after mutation.

**Mutations used:** insert `{post_id,user_id}` and delete filtered by both.

**Ordering/filtering/pagination:** no user saves page is present.

**Security assumptions:** self-owned saves are intended; backend enforcement is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Realtime usage:** all events on the shared channel, filtered by `user_id=eq.currentUserId`.

**Unverified details:** complete columns, uniqueness, indexes, RLS, and cascade behavior.

### 3.5 `orbit_post_mentions`

**Purpose observed:** link between a post and a mentioned user.

**Columns observed:** `post_id`, `mentioned_user_id`, `created_at`.

**Primary-key/unique assumptions:** no primary key or uniqueness is visible from the repository. **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Foreign-key assumptions:** `post_id` to `orbit_feed.id`; `mentioned_user_id` to profile/auth identity are inferred only.

**Relationships observed:** post creation inserts rows; public profile reads rows by `mentioned_user_id`, then retrieves associated posts.

**Queries used:** insert selected mentions; profile tagged lookup; notification trigger lookup.

**Mutations used:** insert only in legacy Orbit client. No update/delete found.

**Ordering/filtering/pagination:** tagged rows ordered by `created_at DESC`, limited to 200; associated post query has no explicit limit.

**Security assumptions:** only selected autocomplete profiles should be mentionable, but the actual insert path is client-controlled and RLS must enforce any constraint. **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Realtime usage:** no Orbit subscription for mention rows was found. Notifications generated by a database trigger are received through `notifications` Realtime.

**Unverified details:** uniqueness, cross-campus validation, RLS, cascade behavior, and whether comments can have mentions.

### 3.6 `profiles`

**Purpose observed:** current and public student identity/profile data used to scope and render Orbit.

**Columns observed in Orbit-related code:**

- `id`
- `full_name`
- `university`
- `bio`
- `avatar_url`
- `wallet_balance`
- `reputation_stars`
- `department`
- `level`
- `interests`
- `badges`
- `is_verified`
- `onboarding_completed`

Orbit feed hydration commonly selects only `id,full_name,avatar_url`; public profile view selects the broader list above.

**Primary-key assumption:** `id` identifies the authenticated profile. Relationship to `auth.users` is explicit in comments and code intent but live constraint is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

**Queries/mutations observed:** current profile read; legacy fallback profile insert; author/comment/liker/actor hydration; profile report insert is separate from Orbit tables.

**Security assumptions:** profile visibility and campus scoping are inferred from direct reads. **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

### 3.7 `notifications`

**Purpose observed:** user-targeted in-app notifications, including Orbit activity.

**Columns observed:** `id`, `type`, `actor_id`, `title`, `body`, `link`, `is_read`, `created_at`, plus `user_id` used in filters.

**Queries/mutations:** unread count; newest 100 list; actor profile hydration; mark read by notification ID and current user ID.

**Relationships observed:** `actor_id` resolves to `profiles.id`; `user_id` is recipient.

**Security assumptions and complete schema:** **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

### 3.8 `reports`

**Purpose observed:** legacy public-profile report storage.

**Columns observed in Orbit code:** `reporter_id`, `content_type`, `content_id`, `reason`, `status`.

**Mutation:** direct insert on profile report. Post report instead calls RPC `orbit_create_report`.

**Security/RPC contract:** **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**. The report table schema and RPC signature are not defined in the repository beyond this call site.

### 3.9 `schools`

No Orbit query or mutation referencing a `schools` table was found. School/campus scoping uses the text `profiles.university` value and post `school_tag` in the legacy client.

Any `schools` relationship or canonical school ID is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

### 3.10 RPCs and Edge Functions

**Confirmed Orbit RPC:**

- `orbit_create_report({p_content_type:'post', p_content_id:id, p_reason:reason})`.

No Orbit feed, like, save, comment, or mention RPC is called by the legacy client. Normal operations use direct Supabase table/storage access.

The checked-in `push_notifications.sql` defines database trigger functions for Orbit notifications, but it is SQL source/documentation, not proof that the live project exactly matches it.

---

## 4. Security and RLS

### 4.1 Authentication

**CONFIRMED FROM REPOSITORY**

- Orbit initialization calls `_supabase.auth.getSession()`.
- An absent session redirects to `index.html`.
- `currentUserId` is populated from the Auth session user ID.
- `profiles` is then queried by that ID, and its university is used for Orbit scoping.

**INFERRED FROM LEGACY CODE**

- Orbit is intended to require authentication.
- The client considers the profile row authoritative over stale session metadata.

**UNVERIFIED — REQUIRES SUPABASE VERIFICATION**

- Whether direct table reads are blocked for unauthenticated clients.
- Whether a user with no profile row should be allowed to access Orbit.
- Whether profile creation fallback is still valid/current; it inserts invented defaults from legacy code and must not be carried into a new implementation without schema/RLS verification.

### 4.2 UI restrictions versus database authorization

**Client-only restrictions observed:**

- Own edit/delete menu visibility.
- Own comment delete button visibility.
- Campus filter on feed/profile posts.
- Campus profile filtering for mention suggestions.
- `poster_id`, `user_id`, `school_tag`, and `mentioned_user_id` values supplied by the browser.

These are not sufficient authorization. A malicious client can bypass UI branches and issue direct Supabase requests. The actual enforcement is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION** for every operation below.

| Operation | Legacy intent | Backend authorization status |
|---|---|---|
| Read campus posts | Authenticated campus users read active/campus posts | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Create post | Current authenticated user creates for current campus | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Update post | Owner only | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Delete post | Owner only | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Insert comment | Authenticated user on accessible post | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Delete comment | Comment owner in UI | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Insert/delete like | Authenticated current user | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Insert/delete save | Authenticated current user | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Insert mention | Post author-selected mention | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Read profiles | Campus participants/public profile view | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Read/update notifications | Recipient only | `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Submit post report RPC | Authenticated reporter | RPC security `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |
| Submit profile report | Authenticated reporter | Table RLS `UNVERIFIED — REQUIRES SUPABASE VERIFICATION` |

### 4.3 Campus, moderation, blocking, and reports

- Campus restrictions are implemented in client queries using `school_tag = userUniversity` and profile `university` filters.
- No Orbit code queries `blocks` when loading/rendering the feed.
- No Orbit code applies moderation-role logic to posts/comments. The only moderation-specific code found was for Campus Whisper.
- Post reporting calls `orbit_create_report`; profile reporting writes directly to `reports`.
- There is no repository evidence that blocked users, muted users, moderation status, or report status affects Orbit feed visibility.
- Whether database views, RLS policies, triggers, or RPCs enforce these concerns is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.

### 4.4 Potential security risks to verify before implementation

1. **Client-supplied author/campus fields:** the insert payload includes `poster_id`, `poster_name`, and `school_tag`; RLS or triggers must prevent spoofing.
2. **Public profile reads:** verify that exposing `full_name`, `avatar_url`, university, and profile metadata is intended for campus users.
3. **Public image URLs:** `getPublicUrl` is used without repository proof that `orbit-images` is public or that generated URLs are safe for all data.
4. **Storage path ownership:** legacy paths begin with the current user ID, but path ownership must be enforced by Storage policies, not naming convention.
5. **Direct social mutations:** inserts/deletes must be protected against arbitrary `user_id` values and cross-campus post IDs.
6. **Mention insertion:** a malicious client could insert mentions for arbitrary users/posts unless RLS/constraints prevent it.
7. **Notification updates:** mark-read must be recipient-only.
8. **Profile report direct insert:** this bypasses the post-report RPC path and requires its own RLS audit.
9. **Realtime payload visibility:** Realtime should not deliver rows the user cannot otherwise read; publication/RLS behavior requires direct verification.

No security policy or database change was made during this audit.

---

## 5. Storage Contract

### 5.1 `orbit-images`

**CONFIRMED FROM REPOSITORY**

- Bucket name: `orbit-images`.
- Upload path: `${currentUserId}/${uuid}_${sanitizedOriginalName}`.
- UUID source: browser `crypto.randomUUID()`.
- Filename sanitization: non-alphanumeric/period/underscore/hyphen characters become `_`.
- Upload happens sequentially before post insert.
- Browser accepts any `image/*` MIME type.
- Browser enforces a maximum of 10 files and 10 MB per file.
- After upload, client calls `getPublicUrl(path)` and stores URLs in `orbit_feed.images`.
- If post insert fails, client calls `remove(uploadedPaths)` as best-effort cleanup.
- There is no existing Orbit image replacement/delete path during post edit.
- Media display limits the visible grid to four images but supports opening all stored images in the viewer.

### 5.2 Unknown Storage behavior

The following are **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**:

- Whether `orbit-images` is public or private.
- Whether `getPublicUrl` is valid/authorized for the production bucket.
- Whether Storage policies enforce authenticated uploads.
- Whether Storage policies restrict users to paths beginning with their own Auth ID.
- Whether MIME type and size are enforced at Storage level.
- Whether arbitrary path traversal or unusual names are prevented at policy/server level.
- Whether objects are associated with posts in Storage metadata or only by URLs in `orbit_feed.images`.
- Whether old images are ever deleted from Storage.
- Whether deletion of a post triggers image cleanup.
- Whether failed mention insertion or failed post processing has any backend cleanup.
- Whether a private bucket should instead use signed URLs or a secure access RPC.
- Whether the live bucket accepts all browser `image/*` values, including SVG or animated/large formats.

### 5.3 Migration implication

The next implementation must not copy the public-URL assumption blindly. It should first verify bucket visibility and policies. If the bucket is private, the correct access mechanism must be derived from the existing Storage contract or approved backend mechanism; no new policy or Edge Function should be invented in the Orbit implementation phase without architectural approval.

---

## 6. Realtime Contract

### 6.1 Existing channel

**CONFIRMED FROM REPOSITORY**

- Channel name: `orbit-live-${currentUserId}`.
- It is created once after Auth/profile initialization, guarded by `orbitRealtimeChannel` and `orbitRealtimeStarting`.
- On setup failure, the channel is removed and state reset.
- Cleanup function exists: `orbitCleanupRealtime()` calls `_supabase.removeChannel(orbitRealtimeChannel)`.
- No invocation of `orbitCleanupRealtime()` was found in the inspected Orbit block; lifecycle cleanup on page unload/navigation is therefore not demonstrated.

### 6.2 Subscriptions

| Table | Event | Filter | Client behavior | UI update | Necessity assessment |
|---|---|---|---|---|---|
| `orbit_feed` | `*` | none at subscription level | Client ignores inserts whose `school_tag` differs; inserts immediately if near top, otherwise queues banner; updates existing posts; removes deletes | Feed/map/banner | Useful for live feed, but a server-side campus filter would reduce payload if supported and verified |
| `orbit_post_likes` | `*` | none | Finds loaded post; increments/decrements count and own state; suppresses own pending mutation events | Like button/count | Useful for live counts, but all table events can be noisy and only loaded posts matter |
| `orbit_comments` | `*` | none | Updates counts and loaded comment arrays; suppresses optimistic own insert/delete duplicates | Comment count/list | Useful only for currently loaded/expanded comments; broad subscription may be excessive |
| `orbit_post_saves` | `*` | `user_id=eq.currentUserId` | Updates current user's saved state for loaded post, suppresses pending own events | Save button | Private-state subscription may be unnecessary if mutations reconcile reliably |
| `notifications` | `INSERT` | `user_id=eq.currentUserId` | Refreshes badge/list and invokes device push foreground handling | Notification badge/modal/device prompt | Necessary for live in-app notifications if existing architecture retains this behavior |

### 6.3 Realtime implementation details

**CONFIRMED FROM REPOSITORY**

- A `realtimeSeen` set suppresses duplicate event keys and caps memory at 5000 keys.
- Event keys use table, event type, and row ID or `post_id:user_id` fallback.
- Feed events are filtered by campus in JavaScript.
- Like/comment/save events are ignored if their post is not in local state.
- Realtime does not hydrate all event-related profile data; profile hydration is called for new/updated feed posts, while comments use cached/hydrated profiles when loaded.
- New feed rows are not automatically inserted while the user is scrolled down; they require explicit banner action.

### 6.4 Publication and security assumptions

- The repository contains no Realtime publication configuration.
- It contains no evidence that all four Orbit tables are published or that filters are supported by the live project.
- Whether Realtime respects RLS for these tables and whether payloads can expose cross-campus rows is **UNVERIFIED — REQUIRES SUPABASE VERIFICATION**.
- Do not add/remove publication entries as part of the next application implementation without Supabase verification and approval.

### 6.5 Duplicate subscriptions and cleanup risk

- Setup guards prevent duplicate Orbit channels within the same global page lifecycle.
- Because Orbit is embedded in a full legacy dashboard rather than a React route lifecycle, cleanup on navigation is not demonstrated.
- The new App Router implementation should bind subscription creation and removal to the route/component lifecycle, but should preserve only verified table/event requirements.

---

## 7. UX Contract

The following behavior is visible in the legacy Orbit UI and should be treated as the compatibility contract for the next implementation unless product review changes it.

### Feed and navigation

- Mobile-first, dark campus-tech visual language with green accent.
- Orbit page is centered and constrained to approximately 680–760px in the legacy CSS.
- Header shows “The Orbit”, campus name, search, and notifications.
- Composer is a prominent campus-sharing card.
- Feed modes: For You, Latest, Trending.
- New posts received while scrolled down use a sticky banner rather than disrupting the current reading position.
- Empty state says the Orbit is quiet; search empty state says no results.
- First-load failure has a retry action.

### Composer

- Opens as a bottom sheet on mobile and centered modal on larger screens.
- Modal is scrollable with a viewport-height cap.
- Shows current avatar/name and campus-only context.
- Text area supports up to 5000 characters with live count.
- Photo picker supports multiple files, preview thumbnails, removal, up to ten images, 10 MB each.
- Submit button is disabled while submitting and exposes progress text such as “Uploading image N of M…” and “Publishing to your campus…”.
- Mention autocomplete appears below the text area and closes on outside click/Escape.

### Post card

- Author row is touch-friendly and opens a public profile view.
- Relative timestamps and an edited indicator are shown.
- Text preserves line breaks and wraps long content.
- Images are responsive, cropped with consistent aspect ratios, and open fullscreen.
- Action buttons have at least roughly 38–40px vertical touch area in mobile CSS.
- Save state is yellow; liked state is green.
- Own-post actions differ from other-user actions.
- Share uses Web Share API when available, otherwise clipboard/fallback URL.

### Comments

- Comments are collapsed initially and lazy-loaded on expansion.
- Comment list has a maximum-height scroll area.
- Initial display is oldest-to-newest after reverse/merge processing.
- Load-more action appears for older pages.
- Comment composer remains attached to the post and supports reply mode with a cancel action.
- Empty comments state is inline.
- Current user's comments expose a delete affordance.
- Replies are currently flat visually even though `parent_comment_id` is sent.

### Profiles and notifications

- Clicking an author opens an overlay/fullscreen profile view.
- Public profile view includes avatar, name, university, verification badge, bio, department, level, reputation, onboarding completion, interests, badges, message request, report profile, authored posts, and tagged posts.
- Notifications open in a fullscreen overlay with unread styling and actor avatar.
- Notification click marks read and may scroll to a loaded Orbit post.
- Media, likes, profiles, and notifications all have skeleton/empty/error variants.

### Keyboard/mobile behavior

- Escape closes media viewer, notifications, likes, and public profile overlays.
- Search focuses/selects and scrolls into view.
- Composer/comment inputs are explicitly focused after relevant actions.
- Mobile CSS supports bottom-sheet composer, horizontal action overflow, safe constrained modal height, responsive image grids, and sticky new-post banner.
- Exact keyboard viewport handling beyond modal scrolling is not explicitly implemented; **UNVERIFIED — REQUIRES UX VERIFICATION** for migration parity.

---

## 8. Performance Findings

### 8.1 Existing strengths

- Main feed uses a bounded page size of 20 and keyset-style cursor pagination.
- Comments use bounded pages of 25 plus one lookahead row.
- Profile hydration batches author IDs with `.in(...)` rather than one request per post.
- Initial likes/comments/saves hydration is performed with three batched queries for a page.
- Realtime events are ignored for posts not currently in memory.
- Images use lazy loading in rendered cards and viewer-safe URL validation.
- Duplicate optimistic/realtime event handling is explicitly attempted.

### 8.2 Risks and N+1 patterns

1. **Feed-page social hydration is broad:** the likes query retrieves every like row for all page posts, not counts only; this can grow with engagement and transfer many rows.
2. **Comment counts retrieve every non-deleted comment row for all page posts:** only `post_id` is selected, but row volume can still be large. A server count/RPC/view would be more scalable, but its existence is unverified and must not be invented.
3. **Like reconciliation adds two requests per like action:** exact count plus current-user state.
4. **“See likes” has no pagination:** a highly liked post can return an unbounded liker list.
5. **Profile view has unbounded authored-post retrieval:** no limit/cursor is applied to a user's posts.
6. **Tagged profile view can be expensive:** up to 200 mention rows, then a post query over all collected IDs, then hydration of social data for all unique posts.
7. **Mention autocomplete is potentially very expensive:** each open/query loads up to 250 profiles, up to 1000 campus post IDs, then current-user likes/comments over those IDs. It is repeated as the user types after debounce.
8. **Client-side search only covers loaded posts:** it avoids server requests but gives incomplete results and can encourage loading more pages manually.
9. **Client-side ranking only covers loaded rows:** For You/Trending are not globally accurate for the campus feed.
10. **Broad Realtime subscriptions:** likes/comments/feed listen to all events in the publication and filter only after delivery; this can be noisy at scale.
11. **Realtime comments update DOM directly:** if many comment events arrive, repeated string replacement can cause unnecessary rendering work.
12. **Sequential image uploads:** uploads are predictable and easy to clean up but increase submit latency linearly.
13. **Public image rendering:** direct URLs may bypass image optimization and can have layout/performance implications; new architecture should decide based on verified Storage behavior.
14. **Global full rerenders:** `orbitRender()` rebuilds all loaded post markup whenever mode/search/realtime state changes, potentially expensive as local state grows.
15. **No persistent cache:** reloads/refocuses re-fetch data; this is simple but offers no stale-while-revalidate behavior.

### 8.3 Race/stale-state risks

- A post can be deleted or updated by Realtime while a profile/social hydration request is still in flight.
- Search can change while a feed page request is pending; the current code renders the latest local map but does not cancel requests.
- A comment may be optimistically inserted, then arrive through Realtime and be reconciled by ID; this is handled but depends on stable client-generated IDs and event timing.
- Optimistic like/save state uses per-post busy/pending maps, but a page reset or post removal during a pending mutation is not explicitly coordinated.
- Profile view state removes temporary profile posts from the shared post map; concurrent feed/realtime events could interact with this global map unexpectedly.
- `loadOrbitMentionSuggestions` starts multiple asynchronous queries while typing; the code does not use request IDs/abort signals, so stale responses may potentially replace newer suggestions.
- The legacy script has no React unmount lifecycle, so channel cleanup and pending request cleanup are not tied to a route boundary.

### 8.4 Recommended architectural response (audit recommendation only)

- Keep feed query, social-state hydration, comment query, and mutation logic in `services/orbit`, not components.
- Use a normalized typed client model separating raw database rows from derived `likeCount`, `commentCount`, `likedByCurrentUser`, and `savedByCurrentUser`.
- Preserve bounded pagination and add explicit request identity/cancellation in the new implementation.
- Avoid loading all likes/comments for counts if the verified backend offers count queries or an existing view/RPC; do not create one without verification.
- Keep Realtime limited to the route lifecycle and only subscribe to events that the verified product requires.
- Consider TanStack Query only if the foundation permits adding it and the team wants cache/invalidation, pagination, mutation rollback, and subscription reconciliation. The audit does not establish that a new dependency is required; do not install it as part of this audit.
- Do not introduce Redux; the Orbit state is feature-local and can be handled with React state/reducer or a query cache.

---

## 9. Migration Risks

1. **Legacy profile field assumptions:** Orbit uses `full_name`, `university`, `avatar_url`, `department`, `level`, `interests`, `badges`, `is_verified`, `onboarding_completed`, and `reputation_stars`. Only repository references confirm usage, not current production schema completeness.
2. **Duplicated author identity:** posts store `poster_name` as well as `poster_id`, so display can diverge from the current profile name. The new UI must decide whether to preserve stored snapshots or hydrate live names; this is a product/data compatibility decision.
3. **Campus string matching:** `profiles.university` and `orbit_feed.school_tag` are compared as text. Case, whitespace, aliases, and renamed schools can produce missing or cross-campus results.
4. **Client-only security:** browser ownership checks can be bypassed. Migration must not infer secure behavior from hidden menus or `.eq(...)` mutation filters.
5. **Hard-coded Supabase credentials in legacy HTML:** `dashboard.html` includes a hard-coded URL and anon key. It is not a service-role key based on the visible JWT claims, but the new application must use environment handling and must not copy credentials into source.
6. **Direct DOM/global state:** Orbit depends on globals such as `_supabase`, `currentUserId`, `userUniversity`, `userFullName`, `currentProfileRecord`, `chat`, `orbitState`, and many inline `onclick` handlers.
7. **Legacy script coupling:** Orbit calls shared functions such as `timeAgo`, `openProfilePage`, device notification handlers, and chat message-request methods. These dependencies are not feature-isolated.
8. **Inline HTML rendering:** escaped strings and inline event handlers are pervasive. A React migration must preserve escaping/security behavior without reproducing unsafe string construction.
9. **Storage URL compatibility:** existing posts store generated public URLs, not necessarily bucket-relative paths. Changing URL strategy could break old images.
10. **Unknown private/public bucket status:** switching to signed URLs without a compatibility plan could make existing stored URLs unusable; retaining public URLs without verification could expose media.
11. **Upload-before-post partial failure:** post creation can leave orphaned objects if cleanup fails. Post creation can also succeed while mention insertion fails.
12. **No media edit/delete workflow:** any new edit UI that changes images could create compatibility and cleanup problems; defer unless backend behavior is verified.
13. **Comment deletion semantics:** reads filter `deleted_at IS NULL`, but deletes issue hard `DELETE`. This mismatch must be clarified before migration.
14. **Reply data versus flat UI:** `parent_comment_id` exists in client writes, but no threaded rendering is implemented.
15. **Incomplete search semantics:** legacy search placeholder says people/hashtags, but actual search only matches loaded `poster_name` and `content`; it does not query people or parse hashtags separately.
16. **Ranking semantics:** For You/Trending are client-local heuristics and are not necessarily product-approved server ranking.
17. **Unbounded public-profile queries:** migrating to Server Components without pagination could worsen server load if the old behavior is copied exactly.
18. **Realtime lifecycle:** legacy cleanup exists but is not visibly invoked; App Router route transitions can otherwise create duplicate subscriptions.
19. **Notification coupling:** Orbit relies on existing notifications triggers and push infrastructure. The new feature must not rewrite `push_notifications.sql`, `notifications-sw.js`, or `send-push.ts`.
20. **Legacy file preservation:** `dashboard.html`, `icos-enhancements.js`, `index.html`, `mobile-app.css`, and notification/PWA assets are part of the migration reference/fallback and must remain untouched.
21. **Current Next foundation is separate:** `src/` contains the new App Router foundation; no Orbit implementation was found there. The migration must not accidentally alter unrelated auth/shell work.
22. **Profile fallback insert risk:** old `init()` inserts `wallet_balance` and `reputation_stars` defaults when no profile exists. This should not be replicated without direct schema/RLS approval.

---

## 10. Proposed Next.js Architecture

This is a blueprint only. No files were created under `src/features/orbit` or `src/services/orbit` during this audit.

### 10.1 Feature boundary

Recommended conceptual structure:

```text
src/features/orbit/
├── components/
│   ├── orbit-page.tsx
│   ├── orbit-header.tsx
│   ├── orbit-search.tsx
│   ├── orbit-feed.tsx
│   ├── orbit-post-card.tsx
│   ├── orbit-post-actions.tsx
│   ├── orbit-composer.tsx
│   ├── orbit-comments.tsx
│   ├── orbit-mention-picker.tsx
│   ├── orbit-media-grid.tsx
│   ├── orbit-media-viewer.tsx
│   ├── orbit-profile-view.tsx
│   ├── orbit-likes-view.tsx
│   ├── orbit-notifications.tsx
│   └── orbit-states.tsx
├── orbit.types.ts
├── orbit.validation.ts
├── orbit.constants.ts
└── orbit.utils.ts
```

Responsibilities:

- Components render typed models and emit user intents.
- `orbit.types.ts` contains raw row types, derived view models, pagination cursors, mutation states, and Realtime event types.
- `orbit.validation.ts` validates composer content, file count/type/size, comment length, and mention payload shape at the client boundary. It must not be treated as authorization.
- `orbit.constants.ts` holds verified UI limits/page sizes only after product/backend review.
- `orbit.utils.ts` holds pure formatting/ranking/URL-safe display helpers; it should not call Supabase.
- Feature components should not construct raw Supabase queries or own notification trigger assumptions.

### 10.2 Service boundary

Recommended conceptual structure:

```text
src/services/orbit/
├── queries.ts
├── mutations.ts
├── realtime.ts
├── storage.ts
└── index.ts
```

Responsibilities:

- `queries.ts`:
  - load campus feed page;
  - hydrate profiles/social state using verified columns/queries;
  - load comments page;
  - load likers/profile posts/tagged posts if those remain in scope;
  - load notification data only if Orbit owns that view or delegates to existing notification service.
- `mutations.ts`:
  - create/edit/delete post;
  - toggle like/save;
  - create/delete comment;
  - insert mentions;
  - report post through the existing RPC;
  - delegate profile report/message request to existing services rather than duplicating them.
- `storage.ts`:
  - validate the verified `orbit-images` access pattern;
  - upload and return the backend-compatible stored representation;
  - perform best-effort cleanup on partial failure;
  - never contain privileged credentials.
- `realtime.ts`:
  - create one channel per mounted Orbit route/user;
  - attach only verified subscriptions;
  - normalize events into feature actions;
  - expose cleanup/unsubscribe.
- `index.ts` re-exports service functions and keeps import paths stable.

Direct Supabase access remains appropriate for normal RLS-protected operations, consistent with the approved architecture. If an operation is business-rule-heavy or already represented by an existing RPC, call that RPC rather than recreating rules in the browser.

### 10.3 Auth/profile integration

- Use the existing centralized Supabase SSR/browser clients and auth/session foundation.
- Resolve the current user through the existing auth mechanism rather than reading legacy globals.
- Resolve campus/profile through an existing profile service or confirmed query.
- Do not auto-create profile rows or add profile fields during Orbit implementation.
- Do not trust a client-provided campus or user ID for authorization.

### 10.4 State strategy

- No Redux is justified by the audit.
- Feature-local React state/reducer is sufficient for UI state, optimistic mutation state, modal state, cursors, and loaded post maps.
- TanStack Query is optional, not required by this audit. It would be justified only if the team wants standardized cache keys, cursor pagination, mutation rollback/invalidation, and background refetch behavior across Orbit views. Do not install it until approved.
- Realtime should dispatch normalized actions into the same state/cache path used by queries and mutations, with request IDs to prevent stale response replacement.

### 10.5 Server/client split

- Server Components or server-side service calls may load the initial feed if the existing SSR client/session architecture supports it and RLS behavior is verified.
- Client components are required for composer, file selection, optimistic likes/saves/comments, media viewer, search input, modal interactions, and Realtime.
- Avoid API routes unless a verified backend requirement exists. Normal RLS-protected access should use centralized Supabase clients.
- Never expose a service-role key to any client or server module that can be bundled to the browser.

### 10.6 Accessibility and UX

- Preserve the mobile bottom-sheet composer, keyboard focus, Escape handling, touch targets, skeletons, empty/error states, and stable scroll position around new posts.
- Replace inline handlers with typed callbacks and semantic buttons/forms.
- Ensure dialog focus management and screen-reader labels are stronger than the legacy implementation.
- Keep image alt text derived from safe display data and do not render raw HTML for post text.

---

## 11. Phase 4B Scope

This scope is proposed from observed legacy behavior only. It requires architectural review and Supabase verification before implementation.

### Must implement

1. Authenticated Orbit route and campus-scoped feed read using verified `orbit_feed` columns and filters.
2. Cursor pagination matching the existing 20-row feed behavior, unless backend verification recommends a different safe query.
3. Loading, empty, retry/error, and new-realtime-post states.
4. Post card with verified author/profile fields, text, timestamps, edited indicator, images, like/comment/save/share actions.
5. Composer with verified 5000-character behavior, text-only and image posts, up to ten images/10 MB browser constraints if backend confirms them.
6. Storage upload and partial-failure cleanup compatible with the existing `orbit-images` contract.
7. Create post mutation with authenticated identity/campus enforcement delegated to RLS/backend.
8. Edit/delete own post behavior, only if live RLS and schema confirm the legacy operations.
9. Like and save state hydration plus optimistic toggle/rollback, only after uniqueness/RLS verification.
10. Lazy paged comments with 25-row behavior, add/delete, and verified parent-comment handling.
11. Mention autocomplete and `orbit_post_mentions` insertion only after mention RLS/trigger verification.
12. Existing `orbit_create_report` integration for post reporting, without replacing the RPC.
13. Route-scoped Realtime for the verified feed/social tables and current-user notifications, with reliable cleanup.
14. Preserve compatibility with existing stored image URLs and notification links.

### Should implement

1. Public profile overlay/page for Orbit author navigation, using only verified profile columns and campus post filters.
2. Liker list view with a bounded/paginated approach if product still requires it.
3. Tagged-post profile section if mention contract and privacy rules are confirmed.
4. Notification badge/list integration by consuming the existing notifications foundation rather than duplicating push logic.
5. Better request cancellation/stale-response protection for search, mentions, profile views, and social hydration.
6. Accessible dialog/focus management and keyboard navigation improvements.
7. Server-side or count-efficient data access if existing verified views/RPCs provide it.
8. Feature-level error telemetry/logging hooks consistent with the application foundation.

### Defer

1. New ranking/recommendation algorithms beyond preserving observed client behavior.
2. Server-side Trending/For You redesign unless product and backend approve a contract.
3. Advanced moderation dashboards/workflows.
4. Analytics, engagement scoring, and trending systems.
5. Complex media processing, transformations, cropping, video, or background jobs.
6. Saved-posts discovery page unless separately included in approved product scope.
7. Threaded/nested comment UI beyond preserving `parent_comment_id` compatibility.
8. Comment mentions unless a confirmed backend contract exists.
9. Blocking/muting/recommendation integration unless existing policy/data contracts are verified.
10. Marketplace, lodge, Study, Chat, Whisper, and other non-Orbit feature logic.
11. Rewriting push notification backend, Edge Functions, SQL, PWA service worker, Storage policies, Realtime configuration, or Auth.

---

## 12. Supabase Verification Required

Before implementation, verify these questions directly against the existing Supabase project. Do not infer answers from legacy UI behavior.

### Schema and relationships

1. What is the exact current schema for `orbit_feed`, including all columns, types, defaults, constraints, indexes, generated values, and nullable fields?
2. Is `orbit_feed.id` the primary key, and what is its type/orderability?
3. Is `orbit_feed.poster_id` constrained to `profiles.id` or `auth.users.id`?
4. What is the exact type/shape of `orbit_feed.images`? Is it a text array, JSON, JSONB, or another representation?
5. Are `status` and `visibility` constrained values, and what are all production values?
6. What are the exact schemas and constraints for `orbit_comments`, including `deleted_at` and `parent_comment_id`?
7. Is comment deletion intended to be hard delete or soft delete?
8. What are the exact schemas, primary keys, unique constraints, indexes, and cascades for `orbit_post_likes`, `orbit_post_saves`, and `orbit_post_mentions`?
9. Is `(post_id,user_id)` unique for likes and saves?
10. Is `(post_id,mentioned_user_id)` unique for mentions?
11. What are the exact current `profiles` columns and privacy expectations used by Orbit?
12. Is there a canonical `schools` table/ID relationship that the legacy text-based university matching bypasses?

### RLS and authorization

13. Can unauthenticated users read `orbit_feed`?
14. Can authenticated users read only posts for their own campus?
15. Can a client insert a post with a different `poster_id`, `poster_name`, or `school_tag`?
16. Are post update/delete policies owner-only?
17. Are comment insert/delete policies correct for the intended product and moderation roles?
18. Are likes and saves restricted to the authenticated user and allowed campus posts?
19. Can a client insert mentions for arbitrary posts/users, or only their own post and valid campus users?
20. Are profile reads restricted appropriately for campus users?
21. Are notifications readable/updatable only by their recipient?
22. Is direct insert into `reports` permitted, and how does it compare with `orbit_create_report`?
23. What does `orbit_create_report` authorize and return?
24. Do blocks, moderation roles, report status, or school membership affect Orbit through RLS or views?

### Storage

25. Is `orbit-images` public or private?
26. What Storage policies exist for insert, select, update, and delete?
27. Do policies enforce `${auth.uid()}/...` object paths?
28. Are MIME types, file size, file count, and file extensions enforced server-side?
29. Are existing stored `images` values public URLs, bucket-relative paths, or mixed historical formats?
30. How should the Next.js app read existing objects if the bucket is private?
31. Is there any approved cleanup mechanism for orphaned images or post deletion?
32. Are old images intentionally retained after post deletion?

### Realtime

33. Are `orbit_feed`, `orbit_post_likes`, `orbit_comments`, `orbit_post_saves`, and `notifications` in the Realtime publication?
34. Are table filters supported and safe for these tables in the current project?
35. Does Realtime enforce the same row visibility/RLS expectations for these events?
36. Are notification triggers deployed and consistent with `push_notifications.sql`?
37. Are Orbit notification triggers active for likes, comments, and mentions?
38. Is any current production trigger/RPC behavior different from the checked-in SQL?

### Product/data compatibility

39. Is the 20-row feed/page size and 25-row comment page size still approved?
40. Are `For You`, `Latest`, and `Trending` expected to remain client-side local modes or be replaced by backend queries?
41. Is search intentionally local-only, or must it search the whole campus dataset?
42. Should stored `poster_name` remain authoritative, or should the new app always hydrate current profile names?
43. Are public profile authored/tagged post views still required in Phase 4B?
44. Are comments with `parent_comment_id` intended to render as threads later?
45. Are mentions supported in comments, or only posts?
46. Are Orbit notifications part of the Orbit implementation or owned by the existing Notifications feature?

---

## 13. Implementation Sequence

Plan only; no implementation was performed.

1. **Obtain direct Supabase verification.** Confirm the schema, relationships, constraints, RLS, Storage, Realtime publication, triggers, RPC signature, and notification behavior listed in Section 12.
2. **Record the verified contract.** Create or update typed database definitions only from confirmed live schema; do not invent missing fields or replace the database source of truth.
3. **Confirm product boundary.** Decide whether Phase 4B includes public profiles, notifications UI, liker list, tagged posts, local search, and all three legacy feed modes.
4. **Map existing application foundation.** Use the centralized browser/server Supabase clients, auth/session service, shell, validation conventions, and error/loading primitives already present in `src/`.
5. **Design raw/derived Orbit types.** Separate verified database row shapes from derived counts/current-user state, cursors, optimistic state, and Realtime payloads.
6. **Implement service queries first.** Add typed feed pagination, profile hydration, verified social-state hydration, comment pagination, and any approved profile/notification reads under `src/services/orbit`.
7. **Implement Storage adapter.** Match the verified bucket access model, preserve existing URL/path compatibility, enforce client UX limits, and add best-effort cleanup for upload-before-insert failures.
8. **Implement mutations.** Add post creation, mentions, edit/delete, likes, saves, comments, and reports using direct RLS-protected access or existing RPCs exactly as verified. Keep UI authorization separate from backend authorization.
9. **Implement Realtime adapter.** Create one route-scoped channel, attach only verified subscriptions/filters, normalize events, reconcile optimistic actions, and guarantee cleanup on unmount/navigation.
10. **Build presentational components.** Recreate the mobile-first UX contract with typed props, accessible dialogs/forms/buttons, safe text rendering, image states, skeletons, empty states, and errors.
11. **Integrate feature state.** Add reducer/query-cache logic for pagination, search, mode sorting, optimistic interactions, pending mutations, and new-post banner behavior. Do not add Redux without new evidence.
12. **Add profile/notification integration only within the approved boundary.** Reuse existing Chat/Profile/Notifications services and push architecture; do not duplicate or rewrite them.
13. **Validate against production-like data safely.** Test read scoping, spoofed IDs, cross-campus IDs, duplicate likes/saves, invalid mentions, Storage paths, failed uploads, failed post inserts, realtime duplicates, route cleanup, and notification recipient isolation.
14. **Review migration compatibility.** Confirm legacy URLs, old post rows, deleted/comment semantics, profile display behavior, and notification links remain readable before replacing or hiding the legacy experience.
15. **Only after review, implement.** This audit should receive architectural approval before any Orbit source files, policies, SQL, Storage, or Realtime configuration are changed.

---

## Audit conclusion

The repository provides a detailed legacy Orbit client contract, but it does not provide authoritative database security or complete schema evidence. The next agent should treat the Supabase project as the source of truth, verify every item in Section 12, and implement only the approved subset under `src/features/orbit` and `src/services/orbit`. No Orbit implementation or unrelated source/configuration change was made during this audit.
