"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CampusChatMessageRequest } from "@/features/chat/chat.types";
import { ChatRequestAction } from "@/features/chat/chat.constants";
import { listRequests, cancelRequest, respondRequest } from "@/services/chat/requests.service";

interface UseMessageRequestsReturn {
  incomingRequests: CampusChatMessageRequest[];
  outgoingRequests: CampusChatMessageRequest[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  
  cancelOutgoing: (requestId: string) => Promise<void>;
  respondIncoming: (requestId: string, action: ChatRequestAction) => Promise<string | null>;
  
  inFlightMutations: Set<string>;
}

export function useMessageRequests(): UseMessageRequestsReturn {
  const [requests, setRequests] = useState<CampusChatMessageRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inFlightMutations, setInFlightMutations] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const requestRef = useRef(0);

  const fetchRequests = useCallback(async () => {
    const reqId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && reqId === requestRef.current) {
        setCurrentUserId(session.user.id);
      }
      
      const data = await listRequests(supabase);
      if (reqId === requestRef.current) {
        setRequests(data);
      }
    } catch (err: any) {
      if (reqId === requestRef.current) {
        setError(err.message || "Failed to load requests.");
      }
    } finally {
      if (reqId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    setTimeout(() => {
      fetchRequests();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelOutgoing = async (requestId: string) => {
    if (inFlightMutations.has(requestId)) return;
    
    setInFlightMutations((prev) => new Set(prev).add(requestId));
    try {
      await cancelRequest(supabase, requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } finally {
      setInFlightMutations((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const respondIncoming = async (requestId: string, action: ChatRequestAction) => {
    if (inFlightMutations.has(requestId)) return null;
    
    setInFlightMutations((prev) => new Set(prev).add(requestId));
    try {
      const convId = await respondRequest(supabase, requestId, action);
      // Remove from list or mark as accepted
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      return convId;
    } finally {
      setInFlightMutations((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const incomingRequests = requests.filter(r => r.recipient_id === currentUserId && r.status === "pending");
  const outgoingRequests = requests.filter(r => r.sender_id === currentUserId && r.status === "pending");

  return {
    incomingRequests,
    outgoingRequests,
    isLoading,
    error,
    refresh: fetchRequests,
    cancelOutgoing,
    respondIncoming,
    inFlightMutations
  };
}
