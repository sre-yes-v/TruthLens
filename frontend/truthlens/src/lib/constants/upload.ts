/**
 * Upload limits — FR-1.1 (formats) and FR-1.2 (size).
 *
 * These are the CLIENT-side copy of the rules. The backend enforces the
 * same rules independently (FR-1.3, FR-1.5); client validation exists to
 * give instant feedback and avoid a pointless 15 MB upload, never as the
 * security boundary. A user can bypass anything in this file.
 */

/** MIME types the backend accepts (FR-1.1). */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Value for an <input type="file"> `accept` attribute. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

/** Human-readable format list, for hint and error text. */
export const ACCEPTED_FORMAT_LABEL = "JPEG, PNG or WEBP";

/** FR-1.2: configurable maximum, default 15 MB. */
export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
