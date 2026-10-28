"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fullscreen for a single element, with a CSS-overlay fallback for browsers
 * that refuse the native Fullscreen API (iOS Safari, embedded webviews, or a
 * rejected `requestFullscreen()` call).
 *
 * The hook never touches the DOM per frame: state changes only on user action
 * and on `fullscreenchange`.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const wasFullscreen = useRef(false);
  const focusReturn = useRef<HTMLElement | null>(null);

  const restoreFocus = useCallback(() => {
    const target = focusReturn.current;
    focusReturn.current = null;
    if (!target) return;
    // Wait for the browser to finish leaving fullscreen before moving focus.
    requestAnimationFrame(() => target.focus?.({ preventScroll: true }));
  }, []);

  // Keep state in sync when the user leaves fullscreen with Esc or the
  // browser's own UI.
  useEffect(() => {
    function sync() {
      const element = ref.current;
      const native = element !== null && document.fullscreenElement === element;
      if (wasFullscreen.current && !native) restoreFocus();
      wasFullscreen.current = native;
      setIsFullscreen(native);
    }

    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [restoreFocus]);

  // The fallback overlay locks scrolling and closes on Esc, mirroring native.
  useEffect(() => {
    if (!isFallback) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFallback(false);
        restoreFocus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFallback, restoreFocus]);

  const enter = useCallback(async () => {
    const element = ref.current;
    focusReturn.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element) return;

    if (document.fullscreenEnabled && typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen({ navigationUI: "hide" });
        // Some browsers resolve without actually entering fullscreen.
        if (document.fullscreenElement === element) {
          setIsFallback(false);
          return;
        }
      } catch {
        // Fall through to the CSS overlay.
      }
    }

    setIsFallback(true);
  }, []);

  const exit = useCallback(async () => {
    if (typeof document.exitFullscreen === "function" && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore: state is reset below either way.
      }
    }
    setIsFullscreen(false);
    setIsFallback(false);
    restoreFocus();
  }, [restoreFocus]);

  const toggle = useCallback(() => {
    if (isFullscreen || isFallback) void exit();
    else void enter();
  }, [enter, exit, isFallback, isFullscreen]);

  return {
    ref,
    /** True while the element is fullscreen, native or via the CSS overlay. */
    isFullscreen: isFullscreen || isFallback,
    /** True when the CSS overlay is standing in for the native API. */
    isFallback,
    enter,
    exit,
    toggle,
  };
}
