import { SupabaseClient } from "@supabase/supabase-js";
import { CampusChatMessageRequest } from "@/features/chat/chat.types";
import { ChatRequestAction } from "@/features/chat/chat.constants";

export async function sendRequest(
  supabase: SupabaseClient,
  recipientId: string,
  message: string
) {
  const { data, error } = await supabase.rpc("campus_chat_send_request", {
    p_recipient_id: recipientId,
    p_message: message,
  });

  if (error) {
    throw new Error(error.message || "Failed to send request.");
  }
  return data;
}

export async function cancelRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("campus_chat_cancel_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(error.message || "Failed to cancel request.");
  }
  return data;
}

export async function listRequests(
  supabase: SupabaseClient
): Promise<CampusChatMessageRequest[]> {
  const { data, error } = await supabase.rpc("campus_chat_list_requests");

  if (error) {
    throw new Error(error.message || "Failed to load requests.");
  }
  return data as CampusChatMessageRequest[];
}

export async function respondRequest(
  supabase: SupabaseClient,
  requestId: string,
  action: ChatRequestAction
): Promise<string | null> {
  const { data, error } = await supabase.rpc("campus_chat_respond_request", {
    p_request_id: requestId,
    p_action: action,
  });

  if (error) {
    throw new Error(error.message || `Failed to ${action} request.`);
  }
  return data as string | null;
}
