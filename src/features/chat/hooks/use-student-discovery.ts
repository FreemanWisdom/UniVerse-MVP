import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CampusChatDiscoverStudent, CampusChatSearchStudent } from "@/features/chat/chat.types";
import { CHAT_CONSTANTS } from "@/features/chat/chat.constants";
import { discoverStudents, searchStudents } from "@/services/chat/discovery.service";

interface UseStudentDiscoveryReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  discoverResults: CampusChatDiscoverStudent[];
  isDiscoverLoading: boolean;
  discoverError: string | null;
  discoverHasMore: boolean;
  loadMoreDiscover: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  
  searchResults: CampusChatSearchStudent[];
  isSearchLoading: boolean;
  searchError: string | null;
  retrySearch: () => Promise<void>;
}

export function useStudentDiscovery(): UseStudentDiscoveryReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [discoverResults, setDiscoverResults] = useState<CampusChatDiscoverStudent[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  
  const [searchResults, setSearchResults] = useState<CampusChatSearchStudent[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const discoverRequestRef = useRef(0);
  const searchRequestRef = useRef(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, CHAT_CONSTANTS.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDiscover = useCallback(async (isRefresh: boolean = false) => {
    const reqId = ++discoverRequestRef.current;
    setIsDiscoverLoading(true);
    if (isRefresh) setDiscoverError(null);

    try {
      const offset = isRefresh ? 0 : discoverResults.length;
      const data = await discoverStudents(supabase, offset);
      
      if (reqId === discoverRequestRef.current) {
        if (isRefresh) {
          setDiscoverResults(data);
        } else {
          setDiscoverResults((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newStudents = data.filter((s) => !existingIds.has(s.id));
            return [...prev, ...newStudents];
          });
        }
        setDiscoverHasMore(data.length === CHAT_CONSTANTS.DISCOVER_PAGE_SIZE);
      }
    } catch (err: any) {
      if (reqId === discoverRequestRef.current) {
        setDiscoverError(err.message || "Failed to discover students.");
      }
    } finally {
      if (reqId === discoverRequestRef.current) {
        setIsDiscoverLoading(false);
      }
    }
  }, [supabase, discoverResults.length]);

  const refreshDiscover = useCallback(async () => {
    await fetchDiscover(true);
  }, [fetchDiscover]);

  const loadMoreDiscover = useCallback(async () => {
    if (isDiscoverLoading || !discoverHasMore) return;
    await fetchDiscover(false);
  }, [isDiscoverLoading, discoverHasMore, fetchDiscover]);

  // Initial load
  useEffect(() => {
    setTimeout(() => {
      fetchDiscover(true);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    const reqId = ++searchRequestRef.current;
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const data = await searchStudents(supabase, debouncedQuery.trim());
        if (reqId === searchRequestRef.current) {
          setSearchResults(data);
        }
      } catch (err: any) {
        if (reqId === searchRequestRef.current) {
          setSearchError(err.message || "Failed to search students.");
        }
      } finally {
        if (reqId === searchRequestRef.current) {
          setIsSearchLoading(false);
        }
      }
  }, [debouncedQuery, supabase]);

  // Search effect
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSearch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSearch]);

  return {
    searchQuery,
    setSearchQuery,
    
    discoverResults,
    isDiscoverLoading,
    discoverError,
    discoverHasMore,
    loadMoreDiscover,
    refreshDiscover,
    
    searchResults,
    isSearchLoading,
    searchError,
    retrySearch: fetchSearch,
  };
}
