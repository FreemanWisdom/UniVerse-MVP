"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  askAiTutor,
  TUTOR_MAX_CONTEXT_LENGTH,
  TUTOR_MAX_QUESTION_LENGTH,
} from "@/services/study/tutor.service";
import { TutorMessage } from "@/features/study/tutor.types";
import { BackButton } from "@/components/back-button";

interface CourseContextState {
  courseCode: string;
  courseTitle: string;
  level: string;
  material: string;
}

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
    <div className="space-y-6">
      <BackButton href="/study" label="Back to Study" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Tutor</h1>
        <p className="text-sm text-slate-400">Ask anything about your courses. It teaches, it doesn&#39;t just answer.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowContext((current) => !current)} aria-expanded={showContext}>
            {showContext ? "Hide course context" : "Add course context (optional)"}
          </Button>

          {showContext ? (
            <div className="space-y-3">
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
                rows={5}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 p-3 text-sm text-foreground"
              />
              <p className="text-[11px] text-slate-500">
                Pasted material is sent with your question so the tutor can prioritize it.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {messages.length === 0 && !sending ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">
            Ask a question below to get started — for example: &#8220;Explain pointers in C like I&#8217;m new to programming.&#8221;
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${index}-${message.role}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-xl bg-campus-500/15 p-3 text-sm text-slate-100"
                    : "max-w-[85%] rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm whitespace-pre-wrap text-slate-200"
                }
              >
                {message.content}
              </div>
            </div>
          ))}
          {sending ? (
            <p className="text-sm text-slate-400">Thinking…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
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
            rows={3}
            className="w-full rounded-lg border border-surface-300 bg-surface-50 p-3 text-sm text-foreground"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">Enter to send · Shift+Enter for a new line</p>
            <Button
              type="button"
              size="sm"
              onClick={() => void send()}
              disabled={sending || input.trim().length === 0}
            >
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
