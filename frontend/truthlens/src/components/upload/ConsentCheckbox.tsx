"use client";

/**
 * The pre-upload consent notice — the prototype's `.consent` block.
 *
 * NFR-4.4 requires a clear statement of what will be extracted from the
 * image, shown *before* the upload is accepted. The prototype implements
 * this as a checkbox that gates the "Analyze image" button, and we keep that.
 *
 * The acknowledgement is client-side only: the SRS defines no consent field
 * on `POST /api/v1/upload`, so we don't invent one. It is a UX gate, not a
 * recorded legal consent. Noted in docs/implementation-notes.md.
 *
 * The whole block is a <label>, so clicking anywhere on the text toggles the
 * box — except the "Details" link, which stops the click from propagating.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  onDetailsClick,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onDetailsClick: () => void;
}) {
  return (
    <label className="mt-[18px] flex items-start gap-[11px] text-left">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-[18px] shrink-0 accent-blue"
      />
      <span className="text-sm text-ink-2">
        I understand TruthLens will read this image to extract metadata, text,
        faces, plates and document types. Nothing is sent to third parties, and
        the original is deleted after 24 hours.{" "}
        <button
          type="button"
          onClick={(event) => {
            // Without this the click would also toggle the checkbox.
            event.preventDefault();
            event.stopPropagation();
            onDetailsClick();
          }}
          className="text-blue underline-offset-2 hover:underline"
        >
          Details
        </button>
      </span>
    </label>
  );
}
