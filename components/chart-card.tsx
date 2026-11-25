"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MaximizeIcon, MinimizeIcon } from "./icons";

type Props = {
  title: string;
  hint?: string;
  /** A row of controls above the chart (for example a 7/30 day switch). */
  toolbar?: ReactNode;
  /** Renders the chart; `expanded` is true inside the full-screen view. */
  children: (expanded: boolean) => ReactNode;
  className?: string;
};

function Header({
  title,
  hint,
  expanded,
  onToggle,
  buttonRef,
}: Pick<Props, "title" | "hint"> & {
  expanded: boolean;
  onToggle: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const Icon = expanded ? MinimizeIcon : MaximizeIcon;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={`font-semibold leading-tight ${expanded ? "text-[22px]" : "text-[15px]"}`}>{title}</h2>
        {hint && <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-faint">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          ref={buttonRef}
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Küçült" : `${title} grafiğini tam ekran büyüt`}
          title={expanded ? "Küçült (Esc)" : "Büyüt"}
          className="clay-sm grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-fg"
        >
          <Icon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** A chart box with an expand button in its top-right corner that opens it full screen. */
export function ChartCard({ title, hint, toolbar, children, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <section className={`clay flex min-h-0 flex-col p-4 sm:p-5 ${className}`} aria-label={title}>
        <Header
          title={title}
          hint={hint}
          expanded={false}
          onToggle={() => setOpen(true)}
          buttonRef={openerRef}
        />
        {toolbar && <div className="mt-2 flex shrink-0 justify-end">{toolbar}</div>}
        <div className="mt-3 min-h-0 flex-1">{children(false)}</div>
      </section>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--bg-deep)_72%,transparent)] p-3 backdrop-blur-sm sm:p-8">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${title} (tam ekran)`}
              className="clay relative mx-auto flex h-full max-w-[1500px] flex-col p-5 sm:p-8"
            >
              <Header
                title={title}
                hint={hint}
                expanded
                onToggle={() => setOpen(false)}
                buttonRef={closeRef}
              />
              {toolbar && <div className="mt-3 flex shrink-0 justify-end">{toolbar}</div>}
              <div className="mt-4 min-h-0 flex-1">{children(true)}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
