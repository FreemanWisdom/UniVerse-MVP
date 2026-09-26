import { ChatLayout } from "@/features/chat/components/chat-layout";

export default function ChatPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Campus Chat</h1>
        <p className="text-sm text-slate-400">Discover and connect with students across the universe.</p>
      </div>

      <ChatLayout />
    </div>
  );
}
