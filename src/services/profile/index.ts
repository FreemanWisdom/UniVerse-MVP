import { SupabaseClient } from "@supabase/supabase-js";
import { StudentProfile, ProfileUpdatePayload } from "@/features/profile/profile.types";

/**
 * Fetches the profile for a given user ID.
 * Works with both server and browser Supabase clients.
 */
export async function getProfile(supabase: SupabaseClient, userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, university, department, level, bio, is_verified, interests")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data as StudentProfile | null;
}

/**
 * Updates the current user's profile.
 * Uses the authenticated context of the passed Supabase client.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: ProfileUpdatePayload
): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, full_name, avatar_url, university, department, level, bio, is_verified, interests")
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error(error.message || "Failed to update profile.");
  }
  
  // Mirror the full_name update to auth.users metadata if it's changing
  if (payload.full_name !== undefined) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
        }
      });
    }
  }

  return data as StudentProfile;
}

/**
 * Uploads a profile photo to the `profile-photos` bucket and updates the profile's avatar_url.
 */
export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  // 1. Upload to storage: map MIME type to canonical extension to prevent mismatches
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const fileExt =
    MIME_TO_EXT[file.type] ||
    file.name.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') ||
    "jpg";
  const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Failed to upload image. Please try again.");
  }

  // 2. Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  if (!publicUrl) {
    throw new Error("Could not retrieve public URL for uploaded photo.");
  }

  // 3. Update profile avatar_url
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    console.error("Profile avatar update error:", updateError);
    // Best effort cleanup if profile update fails
    supabase.storage.from("profile-photos").remove([filePath]).catch(console.error);
    throw new Error("Failed to save profile photo.");
  }

  return publicUrl;
}
