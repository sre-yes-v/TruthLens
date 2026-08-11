"use client";

/**
 * The sticky top bar — the prototype's `.topbar`.
 *
 * Rendered once in the root layout, so it persists across navigation
 * instead of being re-created per page. It is a client component only
 * because it owns the privacy modal's open state.
 *
 * On narrow screens the "How images are handled" label is hidden and the
 * brand keeps its full size: the two actions would otherwise wrap the bar
 * onto a second line. That is a designed mobile behaviour, not a shrink.
 */
import { useState } from "react";
import Link from "next/link";
import { PrivacyModal } from "@/components/modals/PrivacyModal";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { routes } from "@/lib/constants/routes";
import { site } from "@/config/site";
import { isMockMode } from "@/lib/api";

export function Header() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-card px-4 shadow-[0_1px_0_var(--color-divider-2)]">
        {/*
          `min-w-0` + `truncate` let the brand give up width instead of
          pushing the actions off-screen. Without it the header is 457px wide
          in a 375px viewport and the whole page scrolls sideways.
        */}
        <Link
          href={routes.home()}
          className="flex min-w-0 items-center gap-[9px] text-[19px] font-bold tracking-[-0.3px] text-ink"
        >
          <Logo />
          <span className="truncate">{site.name}</span>
          {isMockMode && (
            // Only shown in mock mode, so nobody mistakes sample data for a
            // real analysis during a demo. Hidden on small screens, where the
            // space is better spent on the actions.
            <span className="hidden shrink-0 rounded-full bg-grey px-[7px] py-0.5 text-xs font-semibold tracking-normal text-ink-2 sm:inline">
              Sample data
            </span>
          )}
        </Link>

        <div className="flex-1" />

        {/* Never shrink: these are the only two actions in the bar. */}
        <div className="flex shrink-0 items-center gap-2">
          {/*
            One button whose LABEL shortens on small screens, rather than two
            buttons toggled with `hidden` / `sm:inline-flex`.

            The two-button version looks equivalent but is broken: `Button`
            already applies `inline-flex`, and `hidden` is a display utility
            in the same Tailwind layer — which of them wins is decided by
            their order in the generated stylesheet, not by the order you
            write them in `className`. Both buttons stayed visible and pushed
            the header past the viewport at 375px. Changing the structure
            avoids the conflict instead of fighting it.
          */}
          <Button variant="ghost" size="sm" onClick={() => setPrivacyOpen(true)}>
            <span className="hidden sm:inline">How images are handled</span>
            <span className="sm:hidden">Privacy</span>
          </Button>
          <Link href={routes.home()} className={buttonClasses({ size: "sm" })}>
            New analysis
          </Link>
        </div>
      </header>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
