"use client";

import { useState } from "react";

/**
 * Decorative frame: two portraits facing each other (with a soft shadow) and a logo
 * that snorts smoke every second.
 *
 * Image files are supplied by the project owner:
 *   public/decor/jordan.png      (transparent cut-out, subject faces LEFT)
 *   public/decor/bulls-logo.png  (optional)
 * A missing file renders nothing instead of a broken image.
 */

const PORTRAIT_SRC = "/decor/jordan.png";
const LOGO_SRC = "/decor/bulls-logo.png";

// Nostril centres (percentages of the 553x497 artwork) and the direction each puff drifts.
// A puff is 8% wide, i.e. 7.2% of the box height; subtract half of each to centre.
const NOSTRILS = [
  { left: "calc(43.4% - 4%)", top: "calc(83.5% - 3.6%)", dir: -1 },
  { left: "calc(57.5% - 4%)", top: "calc(83.5% - 3.6%)", dir: 1 },
];
// Two staggered puffs per nostril, each living 2s, give one puff every second.
const PUFF_DELAYS = ["0s", "-1s"];

/**
 * The <img> is server-rendered, so a 404 can fire before React hydrates and the
 * onError handler never runs. This ref callback catches an already-failed image.
 */
function onFailed(handler: () => void) {
  return (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) handler();
  };
}

function Portrait({ side, alt }: { side: "left" | "right"; alt: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;

  // The source faces left, so the left-hand copy is mirrored to face right.
  const mirrored = side === "left";

  return (
    <figure
      className={`pointer-events-none fixed bottom-0 z-0 hidden w-[clamp(180px,22vw,360px)] xl:block ${
        side === "left" ? "left-[1vw]" : "right-[1vw]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied static asset, optional */}
      <img
        src={PORTRAIT_SRC}
        alt={alt}
        decoding="async"
        ref={onFailed(() => setOk(false))}
        onError={() => setOk(false)}
        className="h-auto w-full select-none drop-shadow-[0_26px_34px_rgba(12,2,6,0.6)] drop-shadow-[0_0_26px_var(--glow)]"
        style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      />
    </figure>
  );
}

/** Render at the root of the page: `fixed` breaks inside transformed ancestors. */
export function PortraitPair() {
  return (
    <>
      <Portrait side="left" alt="Michael Jordan, sağa bakıyor" />
      <Portrait side="right" alt="Michael Jordan, sola bakıyor" />
    </>
  );
}

export function BullsLogo() {
  const [logoOk, setLogoOk] = useState(true);
  if (!logoOk) return null;

  return (
    <div className="relative mx-auto mb-4 aspect-[553/497] w-24 sm:w-32">
      {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied static asset, optional */}
      <img
        src={LOGO_SRC}
        alt="Chicago Bulls logosu"
        ref={onFailed(() => setLogoOk(false))}
        onError={() => setLogoOk(false)}
        className="size-full select-none object-contain"
      />
      {NOSTRILS.flatMap((nostril, i) =>
        PUFF_DELAYS.map((delay) => (
          <span
            key={`${i}-${delay}`}
            aria-hidden="true"
            className="logo-smoke"
            style={
              {
                left: nostril.left,
                top: nostril.top,
                animationDelay: delay,
                "--drift": `${nostril.dir * 70}%`,
              } as React.CSSProperties
            }
          />
        ))
      )}
    </div>
  );
}
