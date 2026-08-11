"use client";

/**
 * The drag-and-drop / click-to-browse area — the prototype's `.drop`.
 *
 * Three ways in, all supported:
 *   • drag a file onto it
 *   • click it to open the file picker
 *   • Tab to it and press Enter or Space
 *
 * The keyboard path matters. The prototype's dropzone is a <div> with an
 * onclick, which a keyboard user cannot reach. Here the visible box is a
 * <label> wrapping a real <input type="file">, so the browser handles focus
 * and activation itself — no `tabIndex`, no `onKeyDown`, nothing to get wrong.
 */
import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_FORMAT_LABEL,
  MAX_FILE_SIZE_MB,
} from "@/lib/constants/upload";

export function UploadDropzone({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);

    const dropped = event.dataTransfer.files?.[0];
    // Only the first file: the SRS analyses one image per session (FR-1.4).
    if (dropped) onFileSelected(dropped);
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "block cursor-pointer rounded-drop border-2 border-dashed bg-card px-6 py-10 text-center",
        "transition-colors duration-150",
        dragging
          ? "border-blue bg-blue-wash"
          : "border-divider hover:border-blue hover:bg-blue-wash",
        // The label has no focus of its own — the ring follows the input
        // inside it, which is what actually receives focus.
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onFileSelected(selected);
          // Reset so picking the same file twice still fires `change`.
          event.target.value = "";
        }}
      />

      <Upload
        aria-hidden="true"
        className="mx-auto mb-3 size-11 stroke-[1.8] text-ink-3"
      />
      <span className="block text-base font-semibold">
        Drop an image here or browse
      </span>
      <span className="mt-1.5 block text-[13px] text-ink-3">
        {ACCEPTED_FORMAT_LABEL} · up to {MAX_FILE_SIZE_MB} MB
      </span>
    </label>
  );
}
