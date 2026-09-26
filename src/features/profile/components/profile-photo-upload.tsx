"use client";

import { useState, useRef } from "react";
import { uploadProfilePhoto } from "@/services/profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface ProfilePhotoUploadProps {
  userId: string;
  initialUrl: string | null;
  onUploadSuccess?: (newUrl: string) => void;
}

export function ProfilePhotoUpload({ userId, initialUrl, onUploadSuccess }: ProfilePhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    // Validate type strictly against allowed web image types
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, WebP, or GIF).");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const newUrl = await uploadProfilePhoto(supabase, userId, file);
      setPhotoUrl(newUrl);
      onUploadSuccess?.(newUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-surface-200 bg-surface-100 flex items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={photoUrl} 
            alt="Profile photo" 
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl text-slate-500 font-bold uppercase">
            {/* Fallback to something if no name, though we just use generic placeholder for now */}
            ?
          </span>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-campus-500 border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Change Photo"}
        </Button>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
