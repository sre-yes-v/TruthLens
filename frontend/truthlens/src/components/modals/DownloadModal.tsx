"use client";

/**
 * The "Download report" dialog (UC-6, FR-11.3).
 *
 * FR-11.3 requires the report in both a machine-readable (JSON) and a
 * human-readable (PDF/HTML) form, which is the two options here.
 *
 * The download is fetched as a Blob rather than opened as a link, so we can
 * show a loading state and turn a failure into a toast instead of navigating
 * the user to a raw JSON error page. See `lib/utils/download.ts`.
 */
import { useState } from "react";
import { Braces, FileText } from "lucide-react";
import { Modal, ModalOption } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Progress";
import { api } from "@/lib/api";
import { saveBlob } from "@/lib/utils/download";
import { normalizeError } from "@/lib/utils/errors";
import { useToast } from "@/hooks/useToast";
import type { ReportDownloadFormat } from "@/types/api";

export function DownloadModal({
  open,
  onClose,
  reportId,
}: {
  open: boolean;
  onClose: () => void;
  reportId: string;
}) {
  const { toast, toastError } = useToast();
  const [downloading, setDownloading] = useState<ReportDownloadFormat | null>(
    null,
  );

  async function handleDownload(format: ReportDownloadFormat) {
    setDownloading(format);
    try {
      const file = await api.downloadReport(reportId, format);
      saveBlob(file.blob, file.filename);
      toast(`Report downloaded (${format.toUpperCase()})`);
      onClose();
    } catch (error) {
      toastError(normalizeError(error).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Download report">
      <ModalOption
        icon={<FileText className="size-5" />}
        title="PDF report"
        description="Formatted, readable — for sharing or printing"
        disabled={downloading !== null}
        onClick={() => handleDownload("pdf")}
      />
      <ModalOption
        icon={<Braces className="size-5" />}
        title="JSON data"
        description="Raw structured findings — for developers"
        disabled={downloading !== null}
        onClick={() => handleDownload("json")}
      />

      {downloading && (
        <p className="mt-2 flex items-center justify-center gap-2.5 text-[13px] text-ink-2">
          <Spinner size={20} label="Preparing download" />
          Preparing your {downloading.toUpperCase()} download…
        </p>
      )}
    </Modal>
  );
}
