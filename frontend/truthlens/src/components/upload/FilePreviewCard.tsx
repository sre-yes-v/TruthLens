/**
 * The selected-file card — the prototype's `.filecard`.
 *
 * Shows the thumbnail, filename and size, with a remove button. Kept
 * presentational: it receives a File and two callbacks and holds no state
 * of its own, so it can be rendered in a test or a storybook with a stub.
 */
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { formatFileDescriptor } from "@/lib/utils/formatters";

export function FilePreviewCard({
  file,
  previewUrl,
  onRemove,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3.5 text-left">
      <div className="size-14 shrink-0 overflow-hidden rounded-card bg-[#dfe3e8]">
        {previewUrl && (
          // A local object URL — next/image cannot optimise a blob: URL,
          // and there is nothing to optimise: the bytes are already here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{file.name}</div>
        <div className="text-[13px] text-ink-2">
          {formatFileDescriptor(file)}
        </div>
      </div>

      <IconButton label="Remove image" onClick={onRemove}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}
