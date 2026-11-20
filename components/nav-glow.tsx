"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A liquid glow that slides under the active tab. One full-screen quad and a
 * small fragment shader draw a rounded capsule with a soft halo, a moving
 * shimmer and a rim light; a spring moves it between tabs and squashes /
 * stretches it with its speed. The pointer adds a faint hover glow.
 *
 * Decorative only. `onReady` fires once WebGL is up so the caller can drop its
 * CSS fallback indicator; without WebGL nothing is drawn.
 */

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;       // canvas size in CSS px
uniform float uCenter;   // capsule centre x (px)
uniform float uWidth;    // capsule width (px)
uniform float uStretch;  // 0..1 speed based squash & stretch
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
uniform float uMouse;    // pointer x (px)
uniform float uMouseK;   // 0..1 hover strength

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vUv * uRes;
  vec2 c = vec2(uCenter, uRes.y * 0.5);
  vec2 hs = vec2(uWidth * 0.5 * (1.0 + uStretch * 0.3), uRes.y * 0.5 - 5.0 - uStretch * 2.0);

  vec2 q = p - c;
  // liquid wobble along the capsule edge, stronger while moving
  q.y += (sin(p.x * 0.08 + uTime * 3.0) + sin(p.x * 0.17 - uTime * 2.1)) * (0.5 + uStretch * 2.2);

  float d = sdRoundBox(q, hs, hs.y);
  float body = 1.0 - smoothstep(-1.0, 1.5, d);
  float halo = exp(-max(d, 0.0) / 13.0);
  float rim = (1.0 - smoothstep(0.0, 2.2, abs(d + 1.2))) * 0.5;

  float g = clamp((p.x - (c.x - hs.x)) / max(hs.x * 2.0, 1.0), 0.0, 1.0);
  vec3 col = mix(uA, uB, g * 0.85);

  float sheen = smoothstep(-hs.y * 0.1, -hs.y, q.y) * body * 0.22;
  float shimmer = (sin((p.x - uTime * 70.0) * 0.045) * 0.5 + 0.5) * 0.09 * body;

  float md = abs(p.x - uMouse);
  float mouseGlow = exp(-md / 55.0) * uMouseK * 0.2 * smoothstep(uRes.y, 0.0, abs(p.y - uRes.y * 0.5) * 1.6);

  float a = clamp(body * 0.3 + halo * 0.34 + rim + sheen + shimmer + mouseGlow, 0.0, 1.0);
  vec3 rgb = col * (body * 0.7 + halo * 0.9 + mouseGlow) + vec3(1.0) * (rim * 0.7 + sheen);
  gl_FragColor = vec4(min(rgb, vec3(1.0)) * a, a); // premultiplied alpha
}
`;

function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function NavGlow({
  containerRef,
  activeId,
  onReady,
}: {
  containerRef: RefObject<HTMLElement | null>;
  activeId: string;
  onReady: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nudgeRef = useRef<() => void>(() => {});
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // The active tab changed: wake a reduced-motion (single frame) renderer.
  useEffect(() => {
    nudgeRef.current();
  }, [activeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let teardown = () => {};
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const colorA = new THREE.Color();
      const colorB = new THREE.Color();
      const uniforms = {
        uRes: { value: new THREE.Vector2(1, 1) },
        uCenter: { value: 0 },
        uWidth: { value: 0 },
        uStretch: { value: 0 },
        uTime: { value: 0 },
        uA: { value: colorA },
        uB: { value: colorB },
        uMouse: { value: -999 },
        uMouseK: { value: 0 },
      };
      const readColors = () => {
        colorA.set(cssColor("--accent", "#ff7d8f"));
        colorB.set(cssColor("--teal", "#ffb878"));
      };
      readColors();

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const quad = new THREE.Mesh(geometry, material);
      quad.frustumCulled = false;
      const scene = new THREE.Scene();
      scene.add(quad);
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const target = () => {
        const tab = container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
        if (!tab) return null;
        return { x: tab.offsetLeft + tab.offsetWidth / 2, w: tab.offsetWidth };
      };

      // spring state
      const sx = { pos: -1, vel: 0, width: 0, wvel: 0, stretch: 0 };
      let mouseTarget = 0;
      let mouseX = -999;

      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
        snap();
      };
      const snap = () => {
        const t = target();
        if (!t) return;
        sx.pos = t.x;
        sx.width = t.w;
        sx.vel = sx.wvel = sx.stretch = 0;
        uniforms.uCenter.value = sx.pos;
        uniforms.uWidth.value = sx.width;
        draw();
      };

      const step = (dt: number) => {
        const t = target();
        if (t) {
          if (sx.pos < 0) {
            sx.pos = t.x;
            sx.width = t.w;
          }
          const k = 240;
          const c = 2 * Math.sqrt(k) * 0.55;
          // sub-steps keep the spring stable on slow frames
          const n = Math.max(1, Math.ceil(dt / 0.008));
          const h = dt / n;
          for (let i = 0; i < n; i++) {
            sx.vel += ((t.x - sx.pos) * k - sx.vel * c) * h;
            sx.pos += sx.vel * h;
            sx.wvel += ((t.w - sx.width) * k - sx.wvel * c) * h;
            sx.width += sx.wvel * h;
          }
        }
        const speed = Math.min(1, Math.abs(sx.vel) / 1100);
        sx.stretch += (speed - sx.stretch) * Math.min(1, dt * 14);

        uniforms.uTime.value += dt;
        uniforms.uCenter.value = sx.pos;
        uniforms.uWidth.value = sx.width;
        uniforms.uStretch.value = sx.stretch;
        uniforms.uMouse.value = mouseX;
        uniforms.uMouseK.value += (mouseTarget - uniforms.uMouseK.value) * Math.min(1, dt * 8);
      };

      const draw = () => renderer.render(scene, camera);

      let raf = 0;
      let last = performance.now();
      let visible = true;
      const frame = (now: number) => {
        raf = 0;
        if (disposed || !visible) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        step(dt);
        draw();
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (reduce || raf || !visible) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };

      const onMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseTarget = 1;
      };
      const onLeave = () => {
        mouseTarget = 0;
      };

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      });
      io.observe(container);
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      const mo = new MutationObserver(() => {
        readColors();
        draw();
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      if (!reduce) {
        container.addEventListener("pointermove", onMove, { passive: true });
        container.addEventListener("pointerleave", onLeave);
      }

      nudgeRef.current = () => {
        if (reduce) snap(); // no animation: jump straight to the new tab
      };

      resize();
      snap();
      start();
      onReadyRef.current();

      teardown = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        mo.disconnect();
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerleave", onLeave);
        nudgeRef.current = () => {};
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [containerRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full rounded-[inherit]" />;
}
