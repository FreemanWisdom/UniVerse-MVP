import { SupabaseClient } from "@supabase/supabase-js";
import { CampusChatDiscoverStudent, CampusChatSearchStudent } from "@/features/chat/chat.types";
import { CHAT_CONSTANTS } from "@/features/chat/chat.constants";

export async function discoverStudents(
  supabase: SupabaseClient,
  offset: number
): Promise<CampusChatDiscoverStudent[]> {
  const { data, error } = await supabase.rpc("campus_chat_discover_students", {
    p_limit: CHAT_CONSTANTS.DISCOVER_PAGE_SIZE,
    p_offset: offset,
  });

  if (error) {
    console.error("Error discovering students:", error);
    throw new Error("Failed to discover students. Please try again.");
  }

  return data as CampusChatDiscoverStudent[];
}

export async function searchStudents(
  supabase: SupabaseClient,
  query: string
): Promise<CampusChatSearchStudent[]> {
  const { data, error } = await supabase.rpc("campus_chat_search_students", {
    p_query: query,
  });

  if (error) {
    console.error("Error searching students:", error);
    throw new Error("Failed to search students. Please try again.");
  }

  return data as CampusChatSearchStudent[];
}
