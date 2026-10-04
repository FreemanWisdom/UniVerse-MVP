# study-ai-tutor

Gemini-backed AI Study Tutor edge function (deployed v13, Oct 4 2026).

The system prompt instructs the model to answer in PLAIN TEXT (no markdown
symbols); the app also strips stray markdown display-side in
src/app/(student)/study/tutor/page.tsx.

GOTCHA (caused a live outage Oct 4 2026): deploying this function via the
management API (`PATCH /v1/projects/{ref}/functions/{slug}` with a `body`
string) fails to boot (503 BOOT_ERROR) if the source imports
`jsr:@supabase/functions-js/edge-runtime.d.ts` — the API bundler cannot
resolve jsr: imports. This file therefore has NO import lines; Deno.serve
is a global in the Supabase Edge Runtime. If you edit it, deploy via the
management API with this self-contained source (verified working), or via
`supabase functions deploy` from a machine with the CLI linked.
