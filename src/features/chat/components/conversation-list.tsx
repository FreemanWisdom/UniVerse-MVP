import { ConversationWithDetails } from "@/services/chat/conversations.service";
import { Button } from "@/components/ui/button";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Accept sync or async \u2014 caller may return Promise<ConversationWithDetails[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refresh: () => any;
}

export function ConversationList({
  conversations,
  isLoading,
  error,
  selectedId,
  onSelect,
  refresh
}: ConversationListProps) {
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
      <div className="p-4 flex flex-col gap-3" aria-busy="true" aria-label="Loading conversations">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-surface-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-surface-200 rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-surface-200 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        No conversations yet. Discover students to start chatting!
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain" role="list" aria-label="Conversations">
      <div className="divide-y divide-surface-200">
        {conversations.map(conv => {
          const isSelected = selectedId === conv.id;
          const isUnread = conv.last_message 
            ? (!conv.my_membership?.last_read_at || new Date(conv.last_message.created_at) > new Date(conv.my_membership.last_read_at))
            : false;
            
          return (
            <button
              key={conv.id}
              role="listitem"
              onClick={() => onSelect(conv.id)}
              aria-label={`Conversation with ${conv.other_member.profile.full_name}${isUnread ? ', unread' : ''}`}
              aria-current={isSelected ? "true" : undefined}
              className={`w-full text-left p-4 hover:bg-surface-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-campus-500 ${isSelected ? 'bg-surface-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-300 flex items-center justify-center text-sm font-semibold relative shrink-0" aria-hidden="true">
                  {conv.other_member.profile.avatar_url ? (
                    <img 
                      src={conv.other_member.profile.avatar_url} 
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    conv.other_member.profile.full_name.charAt(0).toUpperCase()
                  )}
                  {isUnread && (
                    <div className="absolute top-0 right-0 h-3 w-3 bg-campus-500 border-2 border-background rounded-full" aria-hidden="true" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'font-semibold text-slate-700'}`}>
                      {conv.other_member.profile.full_name}
                    </h3>
                    {conv.last_message && (
                      <time
                        dateTime={conv.last_message.created_at}
                        className="text-[10px] text-slate-400 whitespace-nowrap ml-2 shrink-0"
                      >
                        {new Date(conv.last_message.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                    )}
                  </div>
                  <p className={`text-xs truncate ${isUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                    {conv.last_message ? conv.last_message.content : "No messages yet"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
