"use client";

/**
 * `/` — the upload screen (UC-1).
 *
 * A client component because the whole page is interactive: file selection,
 * drag-and-drop, validation feedback, and the upload request.
 *
 * Notice how little logic is here. The state machine lives in
 * `useImageUpload`, validation in `lib/validation`, the network call in
 * `lib/api`. This file's job is to say what the user sees in each state —
 * which is what makes it readable.
 */
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { PrivacyModal } from "@/components/modals/PrivacyModal";
import { ConsentCheckbox } from "@/components/upload/ConsentCheckbox";
import { FilePreviewCard } from "@/components/upload/FilePreviewCard";
import { SampleImageChips } from "@/components/upload/SampleImageChips";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { useImageUpload } from "@/hooks/useImageUpload";
import { describeError } from "@/lib/utils/errors";
import { routes } from "@/lib/constants/routes";
import { site } from "@/config/site";

export default function UploadPage() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const upload = useImageUpload();

  const serverError = upload.uploadError
    ? describeError(upload.uploadError)
    : null;

  return (
    <div className="mx-auto max-w-[640px] px-5 pt-16 pb-10 text-center">
      <Logo size={64} />
      <h1 className="mt-5 text-[30px] font-bold tracking-[-0.5px]">
        {site.tagline}
      </h1>
      <p className="mx-auto mt-2 mb-[30px] max-w-[520px] text-lg text-ink-2">
        {site.description}
      </p>

      {/* ---------- Empty state: nothing picked yet ---------- */}
      {!upload.file && (
        <>
          <UploadDropzone onFileSelected={upload.selectFile} />
          <SampleImageChips onSampleSelected={upload.selectFile} />
        </>
      )}

      {/* ---------- Selected state: file chosen, awaiting consent ---------- */}
      {upload.file && (
        <Card padded>
          <FilePreviewCard
            file={upload.file}
            previewUrl={upload.previewUrl}
            onRemove={upload.clearSelection}
          />

          {/* Client-side rejection (FR-1.1 / FR-1.2) — nothing was sent. */}
          {upload.validationMessage && (
            <Banner tone="error" className="mt-4">
              {upload.validationMessage}
            </Banner>
          )}

          {/* Server-side rejection (FR-1.3 / FR-1.5) or a network failure.
              The file passed our checks and the backend still said no —
              which is exactly why client validation is not the boundary. */}
          {serverError && (
            <Banner tone="error" className="mt-4" title={`${serverError.title}.`}>
              {serverError.body}
              {upload.uploadError?.status ? (
                <span className="text-ink-2"> (error {upload.uploadError.status})</span>
              ) : null}
            </Banner>
          )}

          <ConsentCheckbox
            checked={upload.consentGiven}
            onChange={upload.setConsentGiven}
            onDetailsClick={() => setPrivacyOpen(true)}
          />

          <div className="mt-5 flex gap-2.5">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!upload.canSubmit}
              loading={upload.uploading}
              onClick={upload.submit}
            >
              {upload.uploading ? "Uploading…" : "Analyze image"}
            </Button>
          </div>
        </Card>
      )}

      {/* FR-9.6 / FR-11.5: the probabilistic framing is present from the
          very first screen, not only on the report. */}
      <p className="mx-auto mt-[26px] max-w-[640px] text-[12.5px] leading-normal text-ink-3">
        {site.disclaimerShort}
      </p>

      <footer className="mt-10 text-[12.5px] text-ink-3">
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="mx-2 text-ink-2 hover:underline"
        >
          How images are handled
        </button>
        ·
        <Link href={routes.admin()} className="mx-2 text-ink-2 hover:underline">
          Admin
        </Link>
      </footer>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
