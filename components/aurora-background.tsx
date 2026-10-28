"use client";

import { useEffect, useState } from "react";

export function AuroraBackground() {
  const [paused, setPaused] = useState(() =>
    typeof document !== "undefined" ? document.hidden : false
  );

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className={`aurora ${paused ? "aurora-paused" : ""}`} aria-hidden="true">
      <div className="aurora-blob aurora-blob--one" />
      <div className="aurora-blob aurora-blob--two" />
      <div className="aurora-blob aurora-blob--three" />
      <div className="aurora-blob aurora-blob--four" />
      <div className="aurora-grain" />
      <div className="aurora-vignette" />
    </div>
  );
}
