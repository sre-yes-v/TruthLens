"use client";

/**
 * All the state and behaviour of the upload screen, in one hook.
 *
 * WHY A HOOK
 * The page needs seven related pieces of state (file, preview URL, consent,
 * client-side error, server-side error, uploading flag, and the resulting
 * session). Keeping them in the page component would bury the flow inside
 * JSX. Here the logic is readable top to bottom, and the page becomes a
 * description of what the user sees.
 *
 * The state is local on purpose. It is only ever read by the upload screen
 * and is meaningless afterwards, so putting it in a global store would add
 * indirection with nothing in return.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants/routes";
import { validateImageFile } from "@/lib/validation/imageValidation";
import { normalizeError } from "@/lib/utils/errors";
import { setSessionPreview } from "@/lib/utils/sessionPreview";
import type { NormalizedApiError } from "@/types/errors";

export interface UseImageUploadResult {
  file: File | null;
  /** Object URL for the thumbnail, or null when nothing is selected. */
  previewUrl: string | null;
  /** NFR-4.4: the user must acknowledge the notice before uploading. */
  consentGiven: boolean;
  setConsentGiven: (value: boolean) => void;
  /** Failed client-side validation (FR-1.1 / FR-1.2). */
  validationMessage: string | null;
  /** The backend rejected the upload (FR-1.3 / FR-1.5, or a network failure). */
  uploadError: NormalizedApiError | null;
  uploading: boolean;
  /** True when "Analyze image" should be clickable. */
  canSubmit: boolean;

  selectFile: (file: File) => void;
  clearSelection: () => void;
  submit: () => Promise<void>;
}

export function useImageUpload(): UseImageUploadResult {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<NormalizedApiError | null>(null);
  const [uploading, setUploading] = useState(false);

  // Every object URL we create must be revoked, or the browser holds the
  // image bytes in memory for the lifetime of the tab.
  const previewUrlRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  const selectFile = useCallback(
    (nextFile: File) => {
      releasePreview();
      setUploadError(null);
      setConsentGiven(false);
      setFile(nextFile);

      const url = URL.createObjectURL(nextFile);
      previewUrlRef.current = url;
      setPreviewUrl(url);

      // Validate immediately, but still show the file. The prototype keeps
      // the preview card visible with the error beneath it, so the user can
      // see *which* file was rejected.
      const result = validateImageFile(nextFile);
      setValidationMessage(result.valid ? null : (result.message ?? null));
    },
    [releasePreview],
  );

  const clearSelection = useCallback(() => {
    releasePreview();
    setFile(null);
    setPreviewUrl(null);
    setValidationMessage(null);
    setUploadError(null);
    setConsentGiven(false);
  }, [releasePreview]);

  const canSubmit =
    file !== null && validationMessage === null && consentGiven && !uploading;

  const submit = useCallback(async () => {
    if (!file || !canSubmit) return;

    setUploading(true);
    setUploadError(null);

    try {
      const { session_id } = await api.uploadImage(file);

      // Hand the preview to the analysis screen before navigating. The
      // backend has no endpoint that returns the image, so this local blob
      // is the only copy the browser can display.
      setSessionPreview(session_id, file);

      router.push(routes.analyze(session_id));
    } catch (error) {
      // A 422 here is the backend catching something the client couldn't:
      // a corrupted file, or content that doesn't match its extension.
      setUploadError(normalizeError(error));
      setUploading(false);
    }
    // No `finally`: on success the component unmounts during navigation,
    // and setting state on an unmounted component is pointless work.
  }, [file, canSubmit, router]);

  return {
    file,
    previewUrl,
    consentGiven,
    setConsentGiven,
    validationMessage,
    uploadError,
    uploading,
    canSubmit,
    selectFile,
    clearSelection,
    submit,
  };
}
