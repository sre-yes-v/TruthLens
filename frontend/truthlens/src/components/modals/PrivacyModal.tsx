"use client";

/**
 * "How your image is handled" — the consent/transparency notice.
 *
 * Required by NFR-4.4 (a clear, upfront notice before upload is accepted)
 * and reflecting §11's privacy commitments. The wording is the prototype's.
 *
 * When a session id is known it also offers the delete action, which is a
 * real use of `DELETE /api/v1/sessions/{session_id}` — the SRS's promise
 * that a user can remove everything before retention expiry.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FindingList } from "@/components/ui/DataLists";
import { api } from "@/lib/api";
import { routes } from "@/lib/constants/routes";
import { site } from "@/config/site";
import { normalizeError } from "@/lib/utils/errors";
import { useToast } from "@/hooks/useToast";

export function PrivacyModal({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal offers to delete this session's data. */
  sessionId?: string;
}) {
  const router = useRouter();
  const { toast, toastError } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!sessionId) return;
    setDeleting(true);
    try {
      await api.deleteSession(sessionId);
      toast("Session and all its data deleted");
      onClose();
      router.push(routes.home());
    } catch (error) {
      toastError(normalizeError(error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="How your image is handled">
      <FindingList
        items={[
          {
            tag: "Local",
            text: "Analysis runs on TruthLens servers. Your image is never sent to any third-party service.",
          },
          {
            tag: `${site.retentionHours}h`,
            text: `The original image is deleted after ${site.retentionHours} hours unless you choose to keep the report.`,
          },
          {
            tag: "PII",
            text: "Detected personal info appears only in your report — it's never written to general logs.",
          },
          {
            tag: "You",
            text: "You can delete the session and everything in it at any time.",
          },
        ]}
      />

      <div className="mt-4 flex flex-col gap-2.5">
        {sessionId && (
          <Button
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
            className="w-full"
          >
            Delete this session now
          </Button>
        )}
        <Button variant="primary" onClick={onClose} className="w-full">
          Got it
        </Button>
      </div>
    </Modal>
  );
}
