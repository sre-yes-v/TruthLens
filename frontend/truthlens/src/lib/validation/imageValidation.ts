/**
 * Client-side upload validation (FR-1.1, FR-1.2).
 *
 * WHAT THIS IS FOR
 * Instant feedback. Telling someone their 22 MB file is too large before
 * they spend a minute uploading it is a usability win, nothing more.
 *
 * WHAT THIS IS NOT
 * A security control. Anything here runs in the user's browser and can be
 * bypassed with the developer console. The backend re-validates
 * independently — FR-1.3 (content vs declared MIME type), FR-1.5 (corrupted
 * files → 422), NFR-3.2 (magic-byte sniffing before any parser sees the
 * file). The UI therefore has to handle a server-side rejection of a file
 * that passed here, which is exactly what the upload page does.
 *
 * A pure function returning a result object, rather than throwing: an
 * invalid file is an expected outcome, not an exceptional one.
 */
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_FORMAT_LABEL,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "@/lib/constants/upload";
import { formatFileSize } from "@/lib/utils/formatters";

export type ValidationErrorCode = "unsupported_format" | "file_too_large";

export interface ValidationResult {
  valid: boolean;
  errorCode?: ValidationErrorCode;
  /** Message shown directly to the user. */
  message?: string;
}

const VALID: ValidationResult = { valid: true };

export function validateImageFile(file: File): ValidationResult {
  // FR-1.1 — format. Checked against the MIME type the browser reports.
  // A renamed .exe would still pass here; the backend's content sniffing is
  // what actually catches that (NFR-3.2).
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      errorCode: "unsupported_format",
      message: `TruthLens reads ${ACCEPTED_FORMAT_LABEL} images. This file is ${
        file.type || "an unrecognised type"
      }. Export it in one of those formats and try again.`,
    };
  }

  // FR-1.2 — size.
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      errorCode: "file_too_large",
      message: `This image is ${formatFileSize(file.size)}. The maximum size is ${MAX_FILE_SIZE_MB} MB. Choose a smaller image, or resize this one and try again.`,
    };
  }

  return VALID;
}
