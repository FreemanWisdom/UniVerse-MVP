"use client";

import { StudentProfile } from "@/features/profile/profile.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfilePhotoUpload } from "./profile-photo-upload";
import { Button } from "@/components/ui/button";

interface ProfileViewProps {
  profile: StudentProfile;
  onEdit: () => void;
  onAvatarUpdated?: (url: string) => void;
}

export function ProfileView({ profile, onEdit, onAvatarUpdated }: ProfileViewProps) {
  const displayUsername =
    profile.username ||
    String(profile.full_name || "student")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) ||
    "student";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-shrink-0">
          <ProfilePhotoUpload 
            userId={profile.id} 
            initialUrl={profile.avatar_url || null} 
            onUploadSuccess={onAvatarUpdated}
          />
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                {profile.full_name || "Student"}
              </h2>
              <Button onClick={onEdit} variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
            <p className="text-sm text-slate-400">@{displayUsername}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {profile.student_verified && (
              <Badge variant="campus">Verified Student</Badge>
            )}
            {profile.level && (
              <Badge variant="secondary">{profile.level} Level</Badge>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Academic Info</CardTitle>
          <CardDescription>Your registered campus details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-slate-400 font-medium">Institution</p>
            <p className="text-foreground">{profile.university || "Not provided"}</p>
            {!profile.university && (
              <p className="mt-1 text-xs text-slate-400">
                No campus set — chat discovery, study resources, and tribes are
                matched to your school. Contact your campus admin to set yours.
              </p>
            )}
          </div>
          <div>
            <p className="text-slate-400 font-medium">Department</p>
            <p className="text-foreground">{profile.department || "Not provided"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {profile.bio || "No bio added yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
