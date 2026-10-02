"use client";

import { useStudentDiscovery } from "@/features/chat/hooks/use-student-discovery";
import { StudentCard } from "@/features/chat/components/student-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DiscoveryViewProps {
  pendingRequestIds: Set<string>;
  onRequestSent: () => void;
}

export function DiscoveryView({ pendingRequestIds, onRequestSent }: DiscoveryViewProps) {
  const {
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
    retrySearch,
  } = useStudentDiscovery();

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-b border-surface-200">
        <div className="relative max-w-xl mx-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <label htmlFor="student-search" className="sr-only">Search students</label>
          <Input
            id="student-search"
            type="text"
            placeholder="Search students by name, university, or department..."
            className="pl-9 bg-surface-100 border-surface-200 focus-visible:ring-campus-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search students"
          />
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {isSearching ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Search Results
              {isSearchLoading && <span className="text-sm font-normal text-slate-500">(Searching...)</span>}
            </h2>
            
            {searchError ? (
              <div className="text-center p-8 bg-red-950/20 border border-red-900/50 rounded-lg" role="alert">
                <p className="text-red-400 text-sm mb-4">{searchError}</p>
                <Button variant="outline" size="sm" onClick={retrySearch}>
                  Try Again
                </Button>
              </div>
            ) : searchResults.length === 0 && !isSearchLoading ? (
              <div className="text-center p-12 bg-surface-100/50 rounded-lg border border-surface-200 border-dashed">
                <p className="text-slate-400">No students found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
                {searchResults.map((student) => (
                  <StudentCard 
                    key={student.id} 
                    student={student} 
                    isPendingRequest={pendingRequestIds.has(student.id)}
                    onRequestSent={onRequestSent}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Discover Students</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshDiscover}
                disabled={isDiscoverLoading}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                Refresh
              </Button>
            </div>
            
            {discoverError ? (
              <div className="text-center p-8 bg-red-950/20 border border-red-900/50 rounded-lg" role="alert">
                <p className="text-red-400 text-sm mb-4">{discoverError}</p>
                <Button variant="outline" size="sm" onClick={refreshDiscover}>
                  Try Again
                </Button>
              </div>
            ) : discoverResults.length === 0 && !isDiscoverLoading ? (
              <div className="text-center p-12 bg-surface-100/50 rounded-lg border border-surface-200 border-dashed">
                <p className="text-slate-400">Discovery shows students from your campus.</p>
                <p className="mt-1 text-xs text-slate-500">No one else from your school has joined yet — invite your coursemates, or check back soon.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
                  {discoverResults.map((student) => (
                    <StudentCard 
                      key={student.id} 
                      student={student}
                      isPendingRequest={pendingRequestIds.has(student.id)}
                      onRequestSent={onRequestSent}
                    />
                  ))}
                </div>
                
                {discoverHasMore && (
                  <div className="flex justify-center pt-4 pb-8">
                    <Button 
                      variant="outline" 
                      onClick={loadMoreDiscover}
                      disabled={isDiscoverLoading}
                    >
                      {isDiscoverLoading ? "Loading..." : "Load more students"}
                    </Button>
                  </div>
                )}
                
                {!discoverHasMore && discoverResults.length > 0 && (
                  <div className="text-center pt-4 pb-8 text-xs text-slate-500">
                    You&apos;ve reached the end of the discovery list.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
