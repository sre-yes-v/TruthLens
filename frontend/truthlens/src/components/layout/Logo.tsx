/**
 * The TruthLens lens mark from the prototype.
 *
 * Kept as a component rather than a static file because it appears at two
 * very different sizes (26px in the header, 64px on the landing page) and an
 * inline SVG scales without a second asset or a network request.
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <circle cx="16" cy="16" r="14" fill="#1877F2" />
      <circle cx="16" cy="16" r="7.5" fill="#fff" />
      <circle cx="16" cy="16" r="3.2" fill="#1877F2" />
      <circle cx="22" cy="10" r="1.8" fill="#fff" />
    </svg>
  );
}
