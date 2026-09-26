"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Message } from "@/features/chat/chat.types";
import { getMessages, sendMessage } from "@/services/chat/conversations.service";
import { subscribeToMessages } from "@/services/chat/realtime.service";

const PAGE_SIZE = 50;
const MAX_SEEN_MESSAGE_IDS = 500;

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentUserId: string | null;
  loadMore: () => Promise<void>;
  send: (content: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Stable Supabase client — useMemo is the correct pattern to avoid creation each render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const requestRef = useRef(0);
  const inFlightSend = useRef(false);
  // Set-based dedupe for realtime events — avoids unbounded array growth
  const seenMessageIds = useRef(new Set<string>());

  const rememberMessageId = useCallback((messageId: string) => {
    const seen = seenMessageIds.current;
    seen.add(messageId);
    while (seen.size > MAX_SEEN_MESSAGE_IDS) {
      const oldestId = seen.values().next().value;
      if (!oldestId) break;
      seen.delete(oldestId);
    }
  }, []);

  const fetchMessages = useCallback(async (isInitial = true) => {
    if (!conversationId) return;
    
    const reqId = ++requestRef.current;
    
    if (isInitial) {
      setIsLoading(true);
      setMessages([]);
      setHasMore(true);
      seenMessageIds.current = new Set();
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (reqId === requestRef.current && session?.user?.id) {
        setCurrentUserId(session.user.id);
      }

      const oldestMessage = !isInitial && messages.length > 0 ? messages[0] : undefined;
      const beforeCursor = oldestMessage
        ? { created_at: oldestMessage.created_at, id: oldestMessage.id }
        : undefined;
      const data = await getMessages(supabase, conversationId, PAGE_SIZE, beforeCursor);

      if (reqId === requestRef.current) {
        setHasMore(data.length === PAGE_SIZE);
        setMessages(prev => {
          const next = isInitial ? data : [...data, ...prev];
          // Seed seen-ids set from fetched data
          next.forEach(m => rememberMessageId(m.id));
          return next;
        });
      }
    } catch (err: any) {
      if (reqId === requestRef.current) {
        setError(err.message || "Failed to load messages.");
      }
    } finally {
      if (reqId === requestRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  // messages deliberately excluded — we snapshot it via closure at call time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, rememberMessageId, supabase]);

  useEffect(() => {
    setTimeout(() => {
      if (conversationId) {
        fetchMessages(true);
      } else {
        setMessages([]);
        setHasMore(false);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading || !conversationId) return;
    await fetchMessages(false);
  };

  const send = async (content: string) => {
    if (!conversationId || !currentUserId || !content.trim() || inFlightSend.current) return;
    
    inFlightSend.current = true;
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      moderation_status: "active"
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const actualMessage = await sendMessage(supabase, conversationId, content);
      rememberMessageId(actualMessage.id);
      setMessages(prev => prev.map(m => m.id === tempId ? actualMessage : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw new Error(err.message || "Failed to send message.");
    } finally {
      inFlightSend.current = false;
    }
  };

  // Stale-closure refs for realtime handler
  const conversationIdRef = useRef(conversationId);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
    currentUserIdRef.current = currentUserId;
  }, [conversationId, currentUserId]);

  // Realtime subscription — one channel, re-created on conversation switch
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(supabase, (newMessage) => {
      // Wrong conversation — ignore
      if (newMessage.conversation_id !== conversationIdRef.current) return;

      // Set-based dedupe: skip already-seen message ids (handles reconnect re-delivery)
      if (seenMessageIds.current.has(newMessage.id)) return;

      // Own message with optimistic insert already reconciled — skip
      if (newMessage.sender_id === currentUserIdRef.current) return;

      rememberMessageId(newMessage.id);
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, rememberMessageId, supabase]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    currentUserId,
    loadMore,
    send,
    refresh: () => fetchMessages(true)
  };
}
