/**
 * Carrying the uploaded image's preview from the upload page to the
 * analysis page.
 *
 * WHY THIS EXISTS
 * The prototype shows a thumbnail of your image while it is being analysed.
 * The SRS defines no endpoint that returns the uploaded image — the backend
 * stores it privately and deletes it after the retention window (NFR-3.3,
 * NFR-4.1). So the only copy the browser can display is the `File` the user
 * just picked.
 *
 * We keep a blob URL for it in a module-level Map, keyed by session id.
 * A module-level variable survives client-side navigation (it is just
 * JavaScript memory) but not a full page reload.
 *
 * WHAT THAT MEANS
 * Refresh the analysis page and the thumbnail disappears; the placeholder
 * takes over and analysis continues normally. That is a deliberate trade:
 * the alternative is inventing a backend endpoint the SRS doesn't have.
 * Recorded in docs/implementation-notes.md.
 */
import { useSyncExternalStore } from "react";

const previews = new Map<string, string>();

/**
 * No-op subscribe for `useSyncExternalStore` (see `useSessionPreview` below).
 * The preview is written once, before the analysis page mounts, and never
 * changes afterwards — so there is nothing to notify React about.
 */
const subscribe = () => () => {};

/** Stores a preview for a session, replacing and revoking any previous one. */
export function setSessionPreview(sessionId: string, file: File): string {
  clearSessionPreview(sessionId);
  const url = URL.createObjectURL(file);
  previews.set(sessionId, url);
  return url;
}

/** Returns the preview URL, or null if this tab never had one. */
export function getSessionPreview(sessionId: string): string | null {
  return previews.get(sessionId) ?? null;
}

/** Frees the blob URL. Safe to call when nothing is stored. */
export function clearSessionPreview(sessionId: string): void {
  const existing = previews.get(sessionId);
  if (existing) {
    URL.revokeObjectURL(existing);
    previews.delete(sessionId);
  }
}

/**
 * React hook for reading a session's preview.
 *
 * Uses `useSyncExternalStore` because the Map lives outside React and does
 * not exist during server rendering. The third argument is the *server*
 * snapshot: it returns null, so the server renders the placeholder and the
 * browser swaps in the real thumbnail on hydration without a mismatch.
 */
export function useSessionPreview(sessionId: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getSessionPreview(sessionId),
    () => null,
  );
}
