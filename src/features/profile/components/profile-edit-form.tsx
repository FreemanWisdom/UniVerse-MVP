"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentProfile } from "@/features/profile/profile.types";
import { updateProfile } from "@/services/profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ProfileEditFormProps {
  profile: StudentProfile;
  onCancel: () => void;
  onSuccess: (updatedProfile: StudentProfile) => void;
}

export function ProfileEditForm({ profile, onCancel, onSuccess }: ProfileEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    department: profile.department || "",
    level: profile.level || "",
    bio: profile.bio || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.full_name.trim();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }

    if (formData.bio.length > 280) {
      setError("Bio must be 280 characters or less.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const updated = await updateProfile(supabase, profile.id, {
        full_name: trimmedName,
        department: formData.department.trim() || null,
        level: formData.level.trim() || null,
        bio: formData.bio.trim() || null,
      });
      
      onSuccess(updated as StudentProfile);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Edit Profile</CardTitle>
        <CardDescription>Update your campus identity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Full Name</label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Department</label>
            <Input
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Level</label>
            <Input
              name="level"
              value={formData.level}
              onChange={handleChange}
              placeholder="e.g. 100L"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength={280}
              rows={4}
              className="flex w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Write a short bio about yourself (max 280 chars)"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 p-2 bg-red-950/50 rounded border border-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
