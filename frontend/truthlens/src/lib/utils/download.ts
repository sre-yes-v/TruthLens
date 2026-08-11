/**
 * Saving a Blob to the user's disk.
 *
 * The backend download endpoints (SRS §9.1) stream a file with a
 * Content-Disposition header. We fetch that stream as a Blob so we can
 * show a loading state and handle a 404/expired response properly — a bare
 * `<a href="…" download>` would navigate away on failure and show the user
 * a raw JSON error page.
 *
 * The trade-off: the browser's native download progress is lost. For a
 * report PDF or a single image that is the right call.
 */

/** Triggers a browser download for an already-fetched Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Release the object URL — without this the Blob stays in memory for the
  // lifetime of the document.
  URL.revokeObjectURL(url);
}

/**
 * Reads the filename the server suggested via Content-Disposition, falling
 * back to one we generate. Handles both `filename="x.pdf"` and the RFC 5987
 * `filename*=UTF-8''x.pdf` form.
 */
export function filenameFromResponse(
  response: Response,
  fallback: string,
): string {
  const header = response.headers.get("content-disposition");
  if (!header) return fallback;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Malformed encoding — fall through to the plain form.
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch ? plainMatch[1] : fallback;
}
