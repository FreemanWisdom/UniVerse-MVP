"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DiscoveryView } from "@/features/chat/components/discovery-view";
import { RequestsSidebar } from "@/features/chat/components/requests-sidebar";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { MessageThread } from "@/features/chat/components/message-thread";
import { useMessageRequests } from "@/features/chat/hooks/use-message-requests";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { CHAT_REQUEST_ACTIONS, ChatRequestAction } from "@/features/chat/chat.constants";

export function ChatLayout() {
  const [activeTab, setActiveTab] = useState<"conversations" | "requests" | "discover">("conversations");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  // Deep link (?c=<id>): e.g. the Message button on a profile opens the
  // conversation directly. Applied once, when the list has loaded.
  const deepLinkId = searchParams.get("c");
  const deepLinkAppliedRef = useRef(false);

  const {
    incomingRequests,
    outgoingRequests,
    isLoading: isRequestsLoading,
    error: requestsError,
    refresh: refreshRequests,
    cancelOutgoing,
    respondIncoming,
    inFlightMutations
  } = useMessageRequests();

  const {
    conversations,
    isLoading: isConversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
    markAsRead,
    unreadCount
  } = useConversations();

  const handleRespondIncoming = async (id: string, action: ChatRequestAction) => {
    const newConvId = await respondIncoming(id, action);
    if (newConvId && action === CHAT_REQUEST_ACTIONS.ACCEPT) {
      // Refresh the conversations list first
      const newConvs = await refreshConversations();
      setActiveTab("conversations");
      
      // We must only select it if the new string actually matches a conversation ID
      if (newConvs.some(c => c.id === newConvId)) {
        setSelectedConversationId(newConvId);
      } else {
        setSelectedConversationId(null);
      }
    }
    return newConvId;
  };

  useEffect(() => {
    if (
      !deepLinkAppliedRef.current &&
      deepLinkId &&
      !isConversationsLoading &&
      conversations.some(c => c.id === deepLinkId)
    ) {
      deepLinkAppliedRef.current = true;
      setSelectedConversationId(deepLinkId);
      setActiveTab("conversations");
    }
  }, [deepLinkId, isConversationsLoading, conversations]);

  const pendingRequestIds = new Set(outgoingRequests.map(r => r.recipient_id));
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // If a conversation is selected on mobile, hide the sidebar.
  const sidebarClasses = `w-full lg:w-80 lg:shrink-0 min-h-0 flex-col border-r border-surface-200 bg-surface-50/50 ${
    selectedConversationId ? 'hidden lg:flex' : 'flex'
  }`;

  const mainPanelClasses = `flex-1 min-w-0 min-h-0 bg-background ${
    selectedConversationId ? 'flex flex-col' : 'hidden lg:flex flex-col'
  }`;

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] w-full min-w-0 overflow-hidden overscroll-none rounded-xl border border-white/5 bg-surface-100/40">
      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex border-b border-surface-200" role="tablist" aria-label="Chat sections">
          <button 
            role="tab"
            aria-selected={activeTab === "conversations"}
            aria-controls="panel-conversations"
            id="tab-conversations"
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-campus-500 ${activeTab === "conversations" ? "border-campus-600 text-campus-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            onClick={() => setActiveTab("conversations")}
          >
            Chats {unreadCount > 0 && <span className="ml-1 bg-campus-500 text-white text-[10px] px-1.5 py-0.5 rounded-full" aria-label={`${unreadCount} unread`}>{unreadCount}</span>}
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === "requests"}
            aria-controls="panel-requests"
            id="tab-requests"
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-campus-500 ${activeTab === "requests" ? "border-campus-600 text-campus-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            onClick={() => setActiveTab("requests")}
          >
            Requests {incomingRequests.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full" aria-label={`${incomingRequests.length} pending`}>{incomingRequests.length}</span>}
          </button>
          {/* Mobile-only Discover tab: on small screens the main panel (which
              hosts DiscoveryView) is hidden unless a conversation is selected,
              so discovery/search needs a reachable entry point. */}
          <button
            role="tab"
            aria-selected={activeTab === "discover"}
            aria-controls="panel-discover"
            id="tab-discover"
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-campus-500 lg:hidden ${activeTab === "discover" ? "border-campus-600 text-campus-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            onClick={() => setActiveTab("discover")}
          >
            Discover
          </button>
        </div>
        
        {activeTab === "discover" ? (
          <div
            id="panel-discover"
            role="tabpanel"
            aria-labelledby="tab-discover"
            className="flex flex-1 min-h-0 overflow-hidden"
          >
            <DiscoveryView
              pendingRequestIds={pendingRequestIds}
              onRequestSent={() => {
                refreshRequests();
                setActiveTab("requests");
              }}
            />
          </div>
        ) : activeTab === "conversations" ? (
          <div
            id="panel-conversations"
            role="tabpanel"
            aria-labelledby="tab-conversations"
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ConversationList 
              conversations={conversations}
              isLoading={isConversationsLoading}
              error={conversationsError}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              refresh={refreshConversations}
            />
          </div>
        ) : (
          <div
            id="panel-requests"
            role="tabpanel"
            aria-labelledby="tab-requests"
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          >
            <RequestsSidebar 
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              isLoading={isRequestsLoading}
              error={requestsError}
              refresh={refreshRequests}
              cancelOutgoing={cancelOutgoing}
              respondIncoming={handleRespondIncoming}
              inFlightMutations={inFlightMutations}
            />
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className={mainPanelClasses}>
        {selectedConversation ? (
          <MessageThread 
            conversation={selectedConversation} 
            onBack={() => setSelectedConversationId(null)}
            markAsRead={markAsRead}
          />
        ) : (
          <DiscoveryView 
            pendingRequestIds={pendingRequestIds}
            onRequestSent={() => {
              refreshRequests();
              setActiveTab("requests");
            }}
          />
        )}
      </div>
    </div>
  );
}
