import type { SupabaseClient } from "@supabase/supabase-js";

function safeFileName(name: string): string { return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "image"; }

export async function uploadOrbitImages(supabase: SupabaseClient, userId: string, files: File[]): Promise<{ paths: string[]; urls: string[] }> {
  const paths: string[] = [];
  try {
    for (const file of files) {
      const path = `${userId}/${crypto.randomUUID()}_${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("orbit-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("Image upload failed.");
      paths.push(path);
    }
    const urls = paths.map((path) => supabase.storage.from("orbit-images").getPublicUrl(path).data.publicUrl);
    return { paths, urls };
  } catch (error) {
    if (paths.length) await supabase.storage.from("orbit-images").remove(paths);
    throw error;
  }
}

export async function removeOrbitImages(supabase: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length) await supabase.storage.from("orbit-images").remove(paths);
}
