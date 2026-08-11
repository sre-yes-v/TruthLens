/**
 * Display formatting. Pure functions, no React — easy to reason about and
 * easy to unit test.
 */

/** "3.2 MB", "812 KB". Matches the prototype's file-size labels. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** "image/jpeg" → "JPEG". Used in the file preview card. */
export function formatImageType(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? mimeType;
  return subtype.toUpperCase();
}

/** "JPEG · 3.2 MB" — the prototype's combined file descriptor. */
export function formatFileDescriptor(file: File): string {
  return `${formatImageType(file.type)} · ${formatFileSize(file.size)}`;
}

/**
 * Coarse relative time: "just now", "8 minutes ago", "2 hours ago".
 *
 * Deliberately coarse — the report header only needs "Analyzed just now".
 * A full i18n relative-time library would be far more machinery than one
 * line of text justifies.
 */
export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "recently";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * "expires in 21h" for the report header. Returns null when there is no
 * expiry date or it has already passed, so the caller can hide the label
 * instead of printing something misleading.
 */
export function formatExpiry(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const expiry = new Date(isoDate).getTime();
  if (Number.isNaN(expiry)) return null;

  const minutes = Math.round((expiry - Date.now()) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `expires in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `expires in ${hours}h`;
}

/** "10:22:14" — the admin audit log's time column. */
export function formatClockTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Detection confidence 0–1 → "0.94". */
export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

/** Truncates a session/report id for display: "a1b2c3d4e5" → "a1b2". */
export function shortId(id: string, length = 4): string {
  return id.length <= length ? id : id.slice(0, length);
}
