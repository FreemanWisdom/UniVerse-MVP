"use client";

import { useState, useRef } from "react";
import { uploadProfilePhoto } from "@/services/profile";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface ProfilePhotoUploadProps {
  userId: string;
  initialUrl: string | null;
  /** Optional display name — its first letter is used as the avatar fallback. */
  initialName?: string;
  onUploadSuccess?: (newUrl: string) => void;
}

export function ProfilePhotoUpload({
  userId,
  initialUrl,
  initialName,
  onUploadSuccess,
}: ProfilePhotoUploadProps) {
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

  const initial = (initialName || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Change profile photo"
        className="group relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-surface-300 bg-surface-100 transition-colors hover:border-campus-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Profile photo" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-2xl font-bold text-slate-500 uppercase">
            {initial}
          </span>
        )}

        {/* Hover/tap affordance — the whole avatar is the touch target (72px). */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-slate-100 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </span>

        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-campus-500 border-t-transparent" />
          </span>
        )}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
      />

      {error && (
        <p className="mt-1 max-w-[140px] text-center text-[11px] leading-tight text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
