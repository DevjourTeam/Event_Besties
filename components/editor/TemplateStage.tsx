"use client";

import { forwardRef } from "react";
import { archPath } from "@/lib/arch-shape";

/**
 * The template editor's stage — the design shown as a physical arch board
 * standing in a room, with its real dimensions called out. Mirrors the custom
 * canvas editor's CanvasStage so a template and a canvas look like the same
 * product; it just wraps the composed design SVG instead of a Fabric canvas.
 *
 * The room and the measurements are CONTEXT ONLY. They are DOM here and never
 * reach either exported image — the print is rendered separately from the
 * artwork alone (see renderTemplateV2).
 *
 * Layout: a fixed-size host (board + margin) that the editor's zoom scales as a
 * whole. The backdrop is wider than the host and clipped by its overflow, and
 * stands the board on the floor line, exactly as CanvasBackdrop does.
 */

const WORK_PAD = 52; // room around the board for the dimension guides

// Room framing — copied from CanvasBackdrop so the two editors frame a board
// identically. The photo is an empty square room; the board stands on the floor.
const BACKDROP_SRC = "/canvas-backdrop.webp";
const IMG_ASPECT = 1; // square
const FLOOR = 0.8756; // wall/floor junction, as a fraction of image height
const WALL_FILL = 0.85; // how much of the wall a tall board fills
const SIDE_ROOM = 1.35; // room needed either side of the board

type Props = {
  boardW: number;
  boardH: number;
  canvasId: string;
  widthCm?: number;
  heightCm?: number;
};

/** ref is the div the composed SVG is injected into. */
export const TemplateStage = forwardRef<HTMLDivElement, Props>(function TemplateStage(
  { boardW, boardH, canvasId, widthCm, heightCm },
  containerRef
) {
  const hostW = boardW + WORK_PAD * 2;
  const hostH = boardH + WORK_PAD * 2;

  // Backdrop size + placement (same maths as CanvasBackdrop).
  const bH = Math.max(
    boardH / (FLOOR * WALL_FILL),
    (boardW * SIDE_ROOM) / IMG_ASPECT
  );
  const bW = bH * IMG_ASPECT;
  const bLeft = WORK_PAD + boardW / 2 - bW / 2;
  const bTop = WORK_PAD + boardH - FLOOR * bH;

  const outline = archPath(boardW, boardH);
  const showDims = !!widthCm && !!heightCm;

  return (
    <div
      style={{ position: "relative", width: hostW, height: hostH, overflow: "hidden" }}
    >
      {/* room, behind everything and clipped by the host overflow */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKDROP_SRC}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: Math.round(bLeft),
          top: Math.round(bTop),
          width: Math.round(bW),
          height: Math.round(bH),
          maxWidth: "none",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* the board: the composed, arch-clipped design */}
      <div
        style={{
          position: "absolute",
          left: WORK_PAD,
          top: WORK_PAD,
          width: boardW,
          height: boardH,
          zIndex: 1,
        }}
      >
        {/* SVG is injected here by the editor. Clipped to the arch in PIXEL space
            (clip-path: path) so it stays correct under the editor's zoom — unlike
            an SVG clip on the scaled root, whose coordinate space is ambiguous.
            The print file is clipped separately, server-side. Drop shadow lifts
            it off the wall as a physical board (and follows the arch, since it is
            the shadow of the clipped shape). */}
        <div
          id={canvasId}
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            clipPath: `path('${outline}')`,
            WebkitClipPath: `path('${outline}')`,
            filter: "drop-shadow(0 3px 10px rgba(20,25,40,0.12))",
          }}
          className="[&>svg]:block [&>svg]:w-full [&>svg]:h-full"
        />

        {/* red cut line + dimension guides, above the artwork */}
        <svg
          width={boardW}
          height={boardH}
          viewBox={`0 0 ${boardW} ${boardH}`}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 2,
          }}
        >
          <path d={outline} fill="none" stroke="#e0563b" strokeWidth={1.5} />

          {showDims && (
            <>
              {/* width guide (top) */}
              <line x1={0} y1={-18} x2={boardW} y2={-18} stroke="#b4b8c0" strokeWidth={1} />
              <line x1={0} y1={-22} x2={0} y2={-14} stroke="#b4b8c0" strokeWidth={1} />
              <line x1={boardW} y1={-22} x2={boardW} y2={-14} stroke="#b4b8c0" strokeWidth={1} />
              <foreignObject x={boardW / 2 - 50} y={-32} width={100} height={20}>
                <div style={dimLabel}>{widthCm!.toFixed(2)} cm</div>
              </foreignObject>

              {/* height guide (left) */}
              <line x1={-18} y1={0} x2={-18} y2={boardH} stroke="#b4b8c0" strokeWidth={1} />
              <line x1={-22} y1={0} x2={-14} y2={0} stroke="#b4b8c0" strokeWidth={1} />
              <line x1={-22} y1={boardH} x2={-14} y2={boardH} stroke="#b4b8c0" strokeWidth={1} />
              <foreignObject x={-42} y={boardH / 2 - 52} width={24} height={104}>
                <div style={{ ...dimLabel, writingMode: "vertical-rl", transform: "rotate(180deg)", padding: "6px 1px" }}>
                  {heightCm!.toFixed(2)} cm
                </div>
              </foreignObject>
            </>
          )}
        </svg>
      </div>
    </div>
  );
});

const dimLabel: React.CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  color: "#6c727e",
  background: "#ffffff",
  borderRadius: 4,
  padding: "1px 6px",
  textAlign: "center",
  whiteSpace: "nowrap",
  lineHeight: 1.4,
  boxShadow: "0 1px 2px rgba(20,25,40,0.10)",
};
