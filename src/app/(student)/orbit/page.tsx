import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitPage } from "@/features/orbit/components/orbit-page";

export default async function OrbitRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("university").eq("id", user.id).maybeSingle();
  return <OrbitPage userId={user.id} university={profile?.university ?? ""} />;
}
