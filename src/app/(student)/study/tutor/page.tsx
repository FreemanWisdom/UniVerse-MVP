"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  askAiTutor,
  TUTOR_MAX_CONTEXT_LENGTH,
  TUTOR_MAX_QUESTION_LENGTH,
} from "@/services/study/tutor.service";
import { TutorMessage } from "@/features/study/tutor.types";
import { BackButton } from "@/components/back-button";
import { IconBot, IconSend } from "@/components/icons";
import { StudyNotice } from "@/features/study/components/study-ui";

interface CourseContextState {
  courseCode: string;
  courseTitle: string;
  level: string;
  material: string;
}

const SUGGESTIONS = [
  "Explain pointers in C like I'm new to programming",
  "Quiz me on the course I'm studying",
  "Break down this topic into a study plan",
];

const EMPTY_CONTEXT: CourseContextState = {
  courseCode: "",
  courseTitle: "",
  level: "",
  material: "",
};

export default function StudyTutorPage() {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [courseContext, setCourseContext] = useState<CourseContextState>(EMPTY_CONTEXT);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;

    const supabase = createClient();
    setSending(true);
    setError(null);

    const nextMessages: TutorMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    scrollToBottom();

    try {
      const response = await askAiTutor(supabase, {
        question,
        courseCode: courseContext.courseCode || undefined,
        courseTitle: courseContext.courseTitle || undefined,
        level: courseContext.level || undefined,
        context: courseContext.material || undefined,
        conversation: messages,
      });

      setMessages((current) => [...current, { role: "assistant", content: response.answer }]);
      scrollToBottom();
    } catch (askError) {
      // Roll the optimistic user message back into the input so nothing is lost.
      setMessages(messages);
      setInput(question);

      const message = askError instanceof Error ? askError.message : "";
      setError(
        message === "invalid_question"
          ? `Please enter a question (${TUTOR_MAX_QUESTION_LENGTH.toLocaleString()} characters max).`
          : message === "session_expired"
            ? "Your session expired. Please sign in again."
            : message === "tutor_not_configured"
              ? "The AI Tutor isn't configured yet. Please check back later."
              : message === "tutor_unavailable"
                ? "The AI Tutor couldn't process that request. Please try again."
                : "Something went wrong while contacting the AI Tutor. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <BackButton href="/study" label="Back to Study" className="shrink-0" />
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-campus-500/30 bg-campus-500/10 text-campus-300"
          >
            <IconBot size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight tracking-tight text-foreground">AI Tutor</h1>
            <p className="truncate text-xs text-slate-500">Your course assistant · it teaches, it doesn&#39;t just answer</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowContext((current) => !current)} aria-expanded={showContext}>
          {showContext ? "Hide context" : "Add course context"}
        </Button>
      </div>

      <div>
          {showContext ? (
            <div className="space-y-3 rounded-lg border border-surface-200 bg-surface-50/30 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  aria-label="Course code"
                  placeholder="Course code (e.g. CSC 104)"
                  value={courseContext.courseCode}
                  maxLength={100}
                  onChange={(event) => setCourseContext((current) => ({ ...current, courseCode: event.target.value }))}
                />
                <Input
                  aria-label="Course title"
                  placeholder="Course title or subject"
                  value={courseContext.courseTitle}
                  maxLength={200}
                  onChange={(event) => setCourseContext((current) => ({ ...current, courseTitle: event.target.value }))}
                />
                <Input
                  aria-label="Level"
                  placeholder="Level (e.g. 100 level)"
                  value={courseContext.level}
                  maxLength={100}
                  onChange={(event) => setCourseContext((current) => ({ ...current, level: event.target.value }))}
                />
              </div>
              <textarea
                aria-label="Study material"
                value={courseContext.material}
                maxLength={TUTOR_MAX_CONTEXT_LENGTH}
                onChange={(event) => setCourseContext((current) => ({ ...current, material: event.target.value }))}
                placeholder="Paste study material or notes for the tutor to use (optional)"
                rows={4}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 p-3 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
              />
              <p className="text-[11px] text-slate-500">
                Pasted material is sent with your question so the tutor can prioritize it.
              </p>
            </div>
          ) : null}
      </div>

      {messages.length === 0 && !sending ? (
        <div className="space-y-4 rounded-lg border border-dashed border-surface-300 bg-surface-50/30 px-4 py-10 text-center">
          <p className="text-sm text-slate-300">Ask anything about your courses — or start with:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-surface-300 bg-surface-50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-campus-500/50 hover:text-campus-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${index}-${message.role}`} className={message.role === "user" ? "flex justify-end" : "flex items-end justify-start gap-2"}>
              {message.role === "assistant" ? (
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-campus-500/30 bg-campus-500/10 text-campus-300"
                >
                  <IconBot size={14} />
                </span>
              ) : null}
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-campus-500/15 px-3.5 py-2.5 text-sm break-words text-slate-100"
                    : "max-w-[85%] rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed text-slate-200"
                }
              >
                {message.content}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex items-end gap-2 text-sm text-slate-400" aria-live="polite">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-campus-500/30 bg-campus-500/10 text-campus-300">
                <IconBot size={14} />
              </span>
              <span className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-3.5 py-2.5">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-campus-500" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-campus-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-campus-500 [animation-delay:300ms]" />
              </span>
              Thinking…
              </span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      ) : null}

      <div className="rounded-lg border border-surface-200 bg-surface-50/50 p-3">
        <textarea
          aria-label="Your question"
          value={input}
          maxLength={TUTOR_MAX_QUESTION_LENGTH}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Ask the tutor anything about your studies…"
          rows={2}
          className="w-full resize-none rounded-md border-0 bg-transparent p-1 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-200/70 pt-2">
          <p className="text-[11px] text-slate-500">Enter to send · Shift+Enter for a new line</p>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => void send()}
            disabled={sending || input.trim().length === 0}
            aria-label="Send question to AI Tutor"
          >
            <IconSend size={14} />
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
