import { ConversationWithDetails } from "@/services/chat/conversations.service";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";

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
      <div className="divide-y divide-white/5">
        {conversations.map(conv => {
          const isSelected = selectedId === conv.id;
          const isUnread = conv.last_message 
            ? (!conv.my_membership?.last_read_at || new Date(conv.last_message.created_at) > new Date(conv.my_membership.last_read_at))
            : false;
            
          const other = conv.other_member.profile;
          return (
            <div
              key={conv.id}
              role="listitem"
              className={`w-full px-3 py-2.5 transition-colors ${isSelected ? 'bg-white/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar opens the fellow user's profile (real link, outside the conversation button) */}
                <UserAvatar
                  profile={{ id: other.id, full_name: other.full_name, avatar_url: other.avatar_url }}
                  size="md"
                />

                <button
                  onClick={() => onSelect(conv.id)}
                  aria-label={`Open conversation with ${other.full_name}${isUnread ? ', unread' : ''}`}
                  aria-current={isSelected ? "true" : undefined}
                  className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:bg-white/5 rounded"
                >
                  <div className="flex justify-between items-baseline">
                    <UserLink
                      mode="action"
                      userId={other.id}
                      name={other.full_name ?? "Student"}
                      className={`text-sm ${isUnread ? 'font-bold text-foreground' : 'font-medium text-slate-200'}`}
                    />
                    {conv.last_message && (
                      <time
                        dateTime={conv.last_message.created_at}
                        className={`text-[10px] whitespace-nowrap ml-2 shrink-0 ${isUnread ? 'text-campus-400 font-medium' : 'text-slate-500'}`}
                      >
                        {new Date(conv.last_message.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                    )}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    {conv.last_message ? conv.last_message.content : "No messages yet"}
                  </p>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
