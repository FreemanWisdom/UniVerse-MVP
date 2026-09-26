import { SupabaseClient } from "@supabase/supabase-js";
import {
  AskTutorParams,
  TutorMessage,
  TutorResponse,
} from "@/features/study/tutor.types";

// Mirrors the server-side caps so requests are rejected client-side first
// instead of being silently trimmed by the edge function.
export const TUTOR_MAX_QUESTION_LENGTH = 6000;
export const TUTOR_MAX_CONTEXT_LENGTH = 12000;
export const TUTOR_MAX_CONVERSATION_MESSAGES = 8;
export const TUTOR_MAX_MESSAGE_LENGTH = 4000;

export async function askAiTutor(
  supabase: SupabaseClient,
  params: AskTutorParams
): Promise<TutorResponse> {
  const question = params.question.trim();
  if (!question || question.length > TUTOR_MAX_QUESTION_LENGTH) {
    throw new Error("invalid_question");
  }

  const conversation: TutorMessage[] = (params.conversation ?? [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-TUTOR_MAX_CONVERSATION_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, TUTOR_MAX_MESSAGE_LENGTH),
    }));

  const { data, error } = await supabase.functions.invoke("study-ai-tutor", {
    body: {
      question,
      course_code: params.courseCode?.trim().slice(0, 100) || undefined,
      course_title: params.courseTitle?.trim().slice(0, 200) || undefined,
      level: params.level?.trim().slice(0, 100) || undefined,
      context: params.context?.trim().slice(0, TUTOR_MAX_CONTEXT_LENGTH) || undefined,
      conversation: conversation.length > 0 ? conversation : undefined,
    },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;

    if (status === 401) throw new Error("session_expired");
    if (status === 400) throw new Error("invalid_question");
    if (status === 503) throw new Error("tutor_not_configured");
    if (status === 502) throw new Error("tutor_unavailable");
    throw new Error("tutor_failed");
  }

  if (!data || typeof (data as TutorResponse).answer !== "string" || (data as TutorResponse).answer.length === 0) {
    throw new Error("tutor_failed");
  }

  return data as TutorResponse;
}
