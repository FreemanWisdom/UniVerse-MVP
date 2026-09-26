/**
 * Contracts for the study-ai-tutor Edge Function, LIVE-VERIFIED from the
 * deployed source (v9, ACTIVE, verify_jwt=true):
 * POST only. Bearer JWT required. Body: question (required, trimmed,
 * 6000-char cap), course_code (100), course_title/subject (200),
 * level (100), context (12000), conversation (last 8 messages,
 * role user|assistant, 4000 chars each).
 * 200 -> { answer, model, course_code }. Errors: 400 empty question,
 * 401 unauthenticated, 405 wrong method, 502 AI failure/empty answer,
 * 503 not configured, 500 catch-all.
 */

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskTutorParams {
  question: string;
  courseCode?: string;
  courseTitle?: string;
  level?: string;
  context?: string;
  conversation?: TutorMessage[];
}

export interface TutorResponse {
  answer: string;
  model: string;
  course_code: string | null;
}
