import { ORBIT_MAX_COMMENT_LENGTH, ORBIT_MAX_IMAGE_BYTES, ORBIT_MAX_IMAGES, ORBIT_MAX_POST_LENGTH, ORBIT_REPORT_REASONS } from "./orbit.constants";

export function validatePost(content: string, files: File[]): string | null {
  if (!content.trim() && files.length === 0) return "Add some text or at least one image.";
  if (content.length > ORBIT_MAX_POST_LENGTH) return `Posts are limited to ${ORBIT_MAX_POST_LENGTH.toLocaleString()} characters.`;
  if (files.length > ORBIT_MAX_IMAGES) return `You can attach up to ${ORBIT_MAX_IMAGES} images.`;
  for (const file of files) {
    if (!file.type.startsWith("image/")) return "Only image files can be uploaded.";
    if (file.size > ORBIT_MAX_IMAGE_BYTES) return "Each image must be 10 MB or smaller.";
  }
  return null;
}

export function validateComment(content: string): string | null {
  if (!content.trim()) return "Comments cannot be empty.";
  if (content.length > ORBIT_MAX_COMMENT_LENGTH) return `Comments are limited to ${ORBIT_MAX_COMMENT_LENGTH} characters.`;
  return null;
}

export function validateReportReason(reason: string): string | null {
  return (ORBIT_REPORT_REASONS as readonly string[]).includes(reason) ? null : "Choose a valid report reason.";
}
