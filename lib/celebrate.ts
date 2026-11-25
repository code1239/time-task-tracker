/** Small confetti burst from an element (decoration only, skipped for reduced motion). */
export async function celebrateFrom(el: Element | null | undefined, big = false) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = el?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
    : { x: 0.5, y: 0.5 };
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: big ? 90 : 40,
      spread: big ? 90 : 64,
      startVelocity: big ? 34 : 26,
      gravity: 0.95,
      decay: 0.92,
      scalar: 0.9,
      ticks: 120,
      shapes: ["circle"],
      origin,
      colors: ["#2f6fed", "#7fb0ff", "#8edcc0", "#ffe08a", "#e87ba4"],
      disableForReducedMotion: true,
    });
  } catch {
    // decoration only
  }
}
