"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { sendRequest } from "@/services/chat/requests.service";
import { CHAT_CONSTANTS } from "@/features/chat/chat.constants";
import { Button } from "@/components/ui/button";

interface MessageRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  onSuccess?: () => void;
}

export function MessageRequestDialog({
  isOpen,
  onOpenChange,
  recipientId,
  recipientName,
  onSuccess
}: MessageRequestDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    if (message.length > CHAT_CONSTANTS.REQUEST_MESSAGE_MAX_LENGTH) return;
    
    setIsSending(true);
    setError(null);
    try {
      await sendRequest(supabase, recipientId, message.trim());
      setMessage("");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to send request.");
    } finally {
      setIsSending(false);
    }
  }, [message, supabase, recipientId, onSuccess, onOpenChange]);

  const handleClose = useCallback((open: boolean) => {
    if (!open && !isSending) {
      setMessage("");
      setError(null);
      onOpenChange(false);
    }
  }, [isSending, onOpenChange]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      // Defer focus so the dialog is visible before focusing
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const onNativeClose = useCallback(() => {
    if (isOpen && !isSending) {
      setMessage("");
      setError(null);
      onOpenChange(false);
    }
  }, [isOpen, isSending, onOpenChange]);

  const onNativeCancel = useCallback((event: React.SyntheticEvent<HTMLDialogElement>) => {
    if (isSending) event.preventDefault();
  }, [isSending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const charsRemaining = CHAT_CONSTANTS.REQUEST_MESSAGE_MAX_LENGTH - message.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={onNativeClose}
      onCancel={onNativeCancel}
      className="m-auto max-h-[100dvh] overflow-y-auto bg-transparent p-3 backdrop:bg-background/80 backdrop:backdrop-blur-sm sm:p-6"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
      aria-modal="true"
    >
      <div className="w-[min(100%,425px)] rounded-xl border border-surface-200 bg-background p-5 shadow-lg sm:p-6">
        <div className="mb-4">
          <h2 id="dialog-title" className="text-lg font-semibold text-foreground">Message {recipientName}</h2>
          <p id="dialog-desc" className="text-sm text-slate-400 mt-1">
            Send a request to start a conversation. They will need to accept it before you can chat freely.
          </p>
        </div>
        
        <div className="grid gap-4 py-4">
          <label htmlFor="request-message" className="sr-only">Message to {recipientName}</label>
          <textarea
            id="request-message"
            ref={textareaRef}
            className="flex min-h-[120px] w-full rounded-md border border-surface-200 bg-surface-100 px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Introduce yourself…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            </div>
            <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
              {message.length} / {CHAT_CONSTANTS.REQUEST_MESSAGE_MAX_LENGTH}
            </span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            className="bg-campus-600 hover:bg-campus-700 text-white" 
            onClick={handleSend}
            disabled={!message.trim() || isOverLimit || isSending}
          >
            {isSending ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
