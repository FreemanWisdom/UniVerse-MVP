"use client";

import { CampusChatMessageRequest } from "@/features/chat/chat.types";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";
import { CHAT_REQUEST_ACTIONS, ChatRequestAction } from "@/features/chat/chat.constants";
import { Button } from "@/components/ui/button";

interface RequestsSidebarProps {
  incomingRequests: CampusChatMessageRequest[];
  outgoingRequests: CampusChatMessageRequest[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  cancelOutgoing: (requestId: string) => Promise<void>;
  respondIncoming: (requestId: string, action: ChatRequestAction) => Promise<string | null>;
  inFlightMutations: Set<string>;
  onSuccessStatusChange?: () => void;
}

export function RequestsSidebar({
  incomingRequests,
  outgoingRequests,
  isLoading,
  error,
  refresh,
  cancelOutgoing,
  respondIncoming,
  inFlightMutations,
  onSuccessStatusChange
}: RequestsSidebarProps) {
  
  if (error) {
    return (
      <div className="p-4 text-center" role="alert">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-slate-400" aria-live="polite" aria-busy="true">
        Loading requests...
      </div>
    );
  }

  if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        No message requests yet
      </div>
    );
  }

  const handleRespond = async (id: string, action: ChatRequestAction) => {
    try {
      const convId = await respondIncoming(id, action);
      if (convId && action === CHAT_REQUEST_ACTIONS.ACCEPT) {
        onSuccessStatusChange?.();
      }
    } catch (e) {
      // errors handled by hook or parent
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain">
      {incomingRequests.length > 0 && (
        <div className="p-4 border-b border-surface-200">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Incoming Requests</h3>
          <div className="space-y-3">
            {incomingRequests.map((req) => (
              <div key={req.id} className="bg-surface-100 p-3 rounded-lg border border-surface-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar
                    profile={{ id: req.sender_id, full_name: req.sender_full_name, avatar_url: req.sender_avatar_url }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <UserLink
                      userId={req.sender_id}
                      name={req.sender_full_name}
                      className="text-xs font-semibold text-foreground"
                    />
                    <p className="text-[10px] text-slate-500">{req.sender_department}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-3 bg-background p-2 rounded-md">
                  {req.message}
                </p>
                <div className="flex gap-2">
                  <Button 
                    className="h-9 flex-1 bg-campus-600 text-xs text-white hover:bg-campus-700" 
                    onClick={() => handleRespond(req.id, CHAT_REQUEST_ACTIONS.ACCEPT)}
                    disabled={inFlightMutations.has(req.id)}
                    aria-label={`Accept request from ${req.sender_full_name}`}
                  >
                    Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-9 flex-1 text-xs" 
                    onClick={() => handleRespond(req.id, CHAT_REQUEST_ACTIONS.DECLINE)}
                    disabled={inFlightMutations.has(req.id)}
                    aria-label={`Decline request from ${req.sender_full_name}`}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Outgoing Requests</h3>
          <div className="space-y-3">
            {outgoingRequests.map((req) => (
              <div key={req.id} className="bg-surface-100 p-3 rounded-lg border border-surface-200 opacity-80">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar
                    profile={{ id: req.recipient_id, full_name: req.recipient_full_name, avatar_url: req.recipient_avatar_url }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <UserLink
                      userId={req.recipient_id}
                      name={req.recipient_full_name}
                      className="text-xs font-semibold text-foreground"
                    />
                    <p className="text-[10px] text-amber-500">Pending</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {req.message}
                </p>
                <Button 
                  variant="outline" 
                  className="h-9 w-full text-xs" 
                  onClick={() => cancelOutgoing(req.id)}
                  disabled={inFlightMutations.has(req.id)}
                >
                  Cancel Request
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
