"use client";

import { useState } from "react";
import { StudentProfile } from "@/features/profile/profile.types";
import { ProfileView } from "./profile-view";
import { ProfileEditForm } from "./profile-edit-form";

interface ProfilePageClientProps {
  initialProfile: StudentProfile;
}

export function ProfilePageClient({ initialProfile }: ProfilePageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);

  if (isEditing) {
    return (
      <ProfileEditForm 
        profile={profile} 
        onCancel={() => setIsEditing(false)} 
        onSuccess={(updated) => {
          setProfile({ ...profile, ...updated });
          setIsEditing(false);
        }} 
      />
    );
  }

  return (
    <ProfileView 
      profile={profile} 
      onEdit={() => setIsEditing(true)} 
      onAvatarUpdated={(newAvatarUrl) => {
        setProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
      }}
    />
  );
}
