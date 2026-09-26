"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ConversationWithDetails, listConversations, markConversationRead } from "@/services/chat/conversations.service";
import { subscribeToMessages } from "@/services/chat/realtime.service";

interface UseConversationsReturn {
  conversations: ConversationWithDetails[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<ConversationWithDetails[]>;
  markAsRead: (conversationId: string) => Promise<void>;
  unreadCount: number;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable Supabase client — useMemo avoids creating a new instance each render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const requestRef = useRef(0);

  const fetchConversations = useCallback(async () => {
    const reqId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const data = await listConversations(supabase, session.user.id);
      
      // Sort conversations: those with messages by latest message, then by conversation created_at
      data.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at;
        const timeB = b.last_message?.created_at || b.created_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      if (reqId === requestRef.current) {
        setConversations(data);
      }
      return data;
    } catch (err: any) {
      if (reqId === requestRef.current) {
        setError(err.message || "Failed to load conversations.");
      }
      return [];
    } finally {
      if (reqId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    setTimeout(() => {
      fetchConversations();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAsRead = async (conversationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      await markConversationRead(supabase, conversationId, session.user.id);
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId && conv.my_membership) {
          return {
            ...conv,
            my_membership: {
              ...conv.my_membership,
              last_read_at: new Date().toISOString()
            }
          };
        }
        return conv;
      }));
    } catch (err) {
      console.error("Failed to mark conversation as read", err);
    }
  };

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(supabase, (newMessage) => {
      // Find the conversation this message belongs to
      const targetConv = conversationsRef.current.find(c => c.id === newMessage.conversation_id);
      if (targetConv) {
        // Update its last_message and resort
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.id === newMessage.conversation_id) {
              return { ...conv, last_message: newMessage };
            }
            return conv;
          });
          
          updated.sort((a, b) => {
            const timeA = a.last_message?.created_at || a.created_at;
            const timeB = b.last_message?.created_at || b.created_at;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          });
          
          return updated;
        });
      } else {
        // We received a message for a conversation not in our list (e.g. a brand new one).
        // Let's refresh the whole list.
        fetchConversations();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [supabase, fetchConversations]);

  const unreadCount = conversations.filter(c => {
    if (!c.last_message) return false;
    if (!c.my_membership?.last_read_at) return true; // Never read
    return new Date(c.last_message.created_at) > new Date(c.my_membership.last_read_at);
  }).length;

  return {
    conversations,
    isLoading,
    error,
    refresh: fetchConversations,
    markAsRead,
    unreadCount
  };
}
