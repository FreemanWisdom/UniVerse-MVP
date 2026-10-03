"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";
import { useMessages } from "@/features/chat/hooks/use-messages";
import { ConversationWithDetails } from "@/services/chat/conversations.service";
import { Button } from "@/components/ui/button";

interface MessageThreadProps {
  conversation: ConversationWithDetails;
  onBack?: () => void;
  markAsRead: (id: string) => void;
}

export function MessageThread({ conversation, onBack, markAsRead }: MessageThreadProps) {
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    currentUserId,
    loadMore,
    send,
    refresh
  } = useMessages(conversation.id);

  const [composerText, setComposerText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Local ref — tracks whether thread viewport is within 80 px of bottom
  const atBottomRef = useRef(true);

  // Mark as read once on conversation enter only, not on every new message
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (markedRef.current !== conversation.id) {
      markedRef.current = conversation.id;
      markAsRead(conversation.id);
    }
  }, [conversation.id, markAsRead]);

  // Track scroll position so we know whether to auto-scroll on new messages
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80; // px from bottom
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Scroll to bottom only on initial load
  useEffect(() => {
    if (!isLoading && !isLoadingMore && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      atBottomRef.current = true;
    }
    // Only fire on initial load completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Scroll to bottom on new messages only when already at bottom
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    const newCount = messages.length;
    const added = newCount > prevMessageCount.current;
    prevMessageCount.current = newCount;

    if (added && atBottomRef.current && !isLoadingMore && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoadingMore]);

  // Focus composer textarea when thread mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversation.id]);

  const handleSend = async () => {
    if (!composerText.trim() || isSending) return;
    
    setIsSending(true);
    setSendError(null);
    const text = composerText.trim();
    setComposerText("");
    
    try {
      await send(text);
      atBottomRef.current = true;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } catch (err: any) {
      setSendError(err.message || "Failed to send");
      setComposerText(text);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center px-4 py-2 border-b border-white/5 bg-surface-100/40 shrink-0">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-3 lg:hidden p-1.5 -ml-2 text-slate-400 hover:text-foreground rounded-full hover:bg-white/5 transition-colors focus-visible:outline-none"
            aria-label="Back to conversations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <div className="flex items-center gap-3">
          <UserAvatar
            profile={{
              id: conversation.other_member.profile.id,
              full_name: conversation.other_member.profile.full_name,
              avatar_url: conversation.other_member.profile.avatar_url,
            }}
            size="sm"
          />
          <div className="min-w-0">
            <UserLink
              userId={conversation.other_member.profile.id}
              name={conversation.other_member.profile.full_name ?? "Student"}
              className="text-sm font-semibold text-foreground leading-tight"
            />
            <p className="text-[10px] text-slate-400 truncate">
              {conversation.other_member.profile.department} • {conversation.other_member.profile.level}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3 sm:p-4 bg-transparent"
        role="log"
        aria-label="Message history"
        aria-live="polite"
        aria-relevant="additions"
      >
        {error ? (
          <div className="m-auto text-center" role="alert">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className="m-auto flex flex-col items-center gap-3">
            {/* Loading skeleton */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-10 rounded-2xl bg-surface-100/50 animate-pulse ${
                  i % 2 === 0 ? "self-start w-40 sm:w-56" : "self-end w-52 sm:w-72"
                }`}
              />
            ))}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center pb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadMore} 
                  disabled={isLoadingMore}
                  className="text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-campus-500"
                >
                  {isLoadingMore ? "Loading older messages…" : "Load older messages"}
                </Button>
              </div>
            )}
            
            {messages.length === 0 && !hasMore && (
              <div className="m-auto text-center text-sm text-slate-400 max-w-xs py-8">
                <div className="w-10 h-10 rounded-full bg-surface-100/50 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                  <svg className="w-4 h-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p>Say hi to start the conversation!</p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 mt-auto">
              {messages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                const isOptimistic = msg.id.startsWith("temp-");
                
                const orbitMatch = msg.content.match(/^\/orbit\?post=([0-9a-f-]{36})$/m);
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[80%] sm:max-w-[75%] ${isMine ? 'self-end' : 'self-start'}`}
                  >
                    <div 
                      className={`px-3 py-2 rounded-2xl whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        isMine 
                          ? 'bg-campus-600 text-white rounded-br-sm' 
                          : 'bg-surface-200/80 text-slate-200 rounded-bl-sm'
                      } ${isOptimistic ? 'opacity-60' : ''}`}
                    >
                      {orbitMatch ? (
                        <>
                          {msg.content.replace(/^\/orbit\?post=[0-9a-f-]{36}$/m, "").trimEnd()}
                          <a
                            href={`/orbit?post=${orbitMatch[1]}`}
                            className="mt-1 block rounded-md bg-black/20 px-2 py-1.5 text-xs font-medium text-sky-300 underline-offset-2 hover:underline"
                          >
                            Open shared Orbit post →
                          </a>
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <time
                      dateTime={msg.created_at}
                      className={`text-[9px] text-slate-500 mt-0.5 ${isMine ? 'text-right pr-1' : 'text-left pl-1'}`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </div>
                );
              })}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/5 bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {sendError && (
          <div className="mb-2 text-xs text-red-400 flex items-center gap-1 px-2" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {sendError}
            <button
              className="ml-auto text-[10px] underline hover:text-red-300"
              onClick={() => setSendError(null)}
              aria-label="Dismiss error"
            >Dismiss</button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-surface-100/40 rounded-xl border border-white/10 p-1 focus-within:border-campus-500 transition-colors">
          <label htmlFor="message-composer" className="sr-only">Message</label>
          <textarea
            id="message-composer"
            ref={textareaRef}
            placeholder="Type a message…"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={1}
            className="flex-1 max-h-32 min-h-[36px] bg-transparent resize-none outline-none py-2 px-3 text-sm text-foreground placeholder:text-slate-500 disabled:opacity-50"
          />
          <Button 
            size="sm" 
            className="h-8 w-8 p-0 rounded-lg shrink-0 mb-0.5 mr-0.5 bg-campus-600 hover:bg-campus-500 text-white disabled:opacity-50 disabled:bg-white/10 disabled:text-slate-500 transition-colors"
            onClick={handleSend}
            disabled={!composerText.trim() || isSending}
            aria-label="Send message"
          >
            {isSending ? (
               <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
