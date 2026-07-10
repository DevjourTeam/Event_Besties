"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lottie loading animation for the customer editors (dotLottie-web).
 *
 * The animation is self-hosted at public/loader.lottie rather than pulled from
 * lottie.host, so there is no third-party runtime dependency inside the Shopify
 * iframe. Swap it by replacing that file, or point
 * NEXT_PUBLIC_LOADER_LOTTIE_SRC at any .lottie/.json URL.
 *
 * If the animation fails to load for any reason, we fall back to a plain CSS
 * spinner — a loading screen must never end up blank.
 */
const SRC = process.env.NEXT_PUBLIC_LOADER_LOTTIE_SRC || "/loader.lottie";

export function EditorLoader({
  label = "Loading…",
  width = 260,
  height = 146, // 16:9 — matches the 1920x1080 loader animation
}: {
  label?: string;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  // The player's wasm is ~1.8MB — show a plain spinner until Lottie is actually
  // painting, so the loading card is never itself blank while it loads.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dotLottie: { destroy?: () => void } | null = null;

    (async () => {
      try {
        // Dynamic import keeps the wasm-backed player out of the initial bundle.
        const { DotLottie } = await import("@lottiefiles/dotlottie-web");
        if (cancelled || !canvasRef.current) return;
        // Serve the wasm from our own origin instead of the jsdelivr CDN the
        // package defaults to — no third-party runtime dependency, and it works
        // inside the Shopify iframe regardless of the storefront's CSP.
        DotLottie.setWasmUrl("/dotlottie-player.wasm");
        const instance = new DotLottie({
          autoplay: true,
          loop: true,
          canvas: canvasRef.current,
          src: SRC,
          // Centre and scale to fit whatever aspect the animation has.
          layout: { fit: "contain", align: [0.5, 0.5] },
        });
        if (process.env.NEXT_PUBLIC_LOADER_DEBUG === "1") {
          (["load", "loadError", "ready", "render"] as const).forEach((ev) =>
            instance.addEventListener(ev, (e: unknown) =>
              console.log("[loader]", ev, e)
            )
          );
        }
        instance.addEventListener("loadError", () => setFailed(true));
        instance.addEventListener("load", () => {
          if (!cancelled) setPlaying(true);
        });
        dotLottie = instance;
      } catch (e) {
        console.warn("[loader] init failed", e);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      try {
        dotLottie?.destroy?.();
      } catch {
        /* already torn down */
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-9 py-8 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div
          className="relative grid place-items-center"
          style={{ width, height }}
        >
          {/* Kept mounted (the player needs the ref) but hidden until it paints. */}
          {!failed && (
            <canvas
              ref={canvasRef}
              width={width * 2}
              height={height * 2}
              style={{
                width,
                height,
                display: "block",
                opacity: playing ? 1 : 0,
                transition: "opacity 0.25s ease",
              }}
              aria-hidden
            />
          )}
          {(failed || !playing) && (
            <span
              aria-hidden
              style={{ width: 44, height: 44 }}
              className="absolute rounded-full border-[3px] border-[#e2e2e6] border-t-[#a98b52] animate-spin"
            />
          )}
        </div>
        <span className="text-[13px] text-text-muted">{label}</span>
      </div>
    </div>
  );
}
