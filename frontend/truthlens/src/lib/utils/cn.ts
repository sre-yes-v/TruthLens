/**
 * Joins class names, dropping anything falsy.
 *
 *   cn("btn", isPrimary && "btn-primary", className)
 *
 * This is the whole utility — no `clsx`, no `tailwind-merge`.
 *
 * IMPORTANT CONSEQUENCE
 * Because there is no merging, passing a class that CONFLICTS with one a
 * component already applies does not reliably override it. Tailwind decides
 * between two utilities in the same group (two `display` values, two
 * paddings) by their order in the generated stylesheet — not by their order
 * in the `className` string. So `<Button className="hidden sm:inline-flex">`
 * silently loses to Button's own `inline-flex`.
 *
 * The rule: use `className` for properties the component doesn't set
 * (margins, width, grid placement). When you need to change one it does set,
 * change the structure — wrap it, or add a prop — rather than layering a
 * second utility on top. See `components/layout/Header.tsx` for a worked
 * example of that fix.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
