"use client";

import { forwardRef } from "react";
import { archPath } from "@/lib/arch-shape";

/**
 * The template editor's stage — the design shown as a physical arch board
 * standing in a room, with its real dimensions called out. Mirrors the custom
 * canvas editor so a template and a canvas read as the same product; it just
 * wraps the composed design SVG instead of a Fabric canvas.
 *
 * The room and the measurements are CONTEXT ONLY. They are DOM here and never
 * reach either exported image — the print is rendered separately, from the
 * artwork alone (see renderTemplateV2).
 *
 * The whole stage is a fixed-size box (the full room) that the editor's zoom
 * scales to the viewport. The board stands on the room's floor line, centred,
 * with room to each side — the same framing the reference mockup shows.
 */

// Room framing. Full empty-room photo (square); the board stands on the floor.
const BACKDROP_SRC = "/canvas-backdrop.webp";
const IMG_ASPECT = 1; // the photo is square
const FLOOR = 0.8756; // wall/floor junction, as a fraction of room height
const WALL_FILL = 0.8; // how much of the wall a tall board fills
const SIDE_ROOM = 2.6; // room width as a multiple of the board width

/** The full stage (room) size for a given board, in px. */
export function stageSize(boardW: number, boardH: number) {
  const roomH = Math.max(boardH / (FLOOR * WALL_FILL), boardW * SIDE_ROOM);
  const roomW = roomH * IMG_ASPECT;
  return { roomW: Math.round(roomW), roomH: Math.round(roomH) };
}

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
  const { roomW, roomH } = stageSize(boardW, boardH);
  const boardLeft = Math.round((roomW - boardW) / 2);
  const boardTop = Math.round(FLOOR * roomH - boardH); // stand on the floor line

  const outline = archPath(boardW, boardH);
  const showDims = !!widthCm && !!heightCm;

  return (
    <div style={{ position: "relative", width: roomW, height: roomH }}>
      {/* the room, filling the whole stage */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKDROP_SRC}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: roomW,
          height: roomH,
          maxWidth: "none",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* the board: the composed design, cut to the arch */}
      <div
        style={{
          position: "absolute",
          left: boardLeft,
          top: boardTop,
          width: boardW,
          height: boardH,
          zIndex: 1,
        }}
      >
        {/* SVG injected here by the editor. Cut to the arch in PIXEL space
            (clip-path: path) so it stays correct under the editor's zoom — an
            SVG clip on the scaled root has an ambiguous coordinate space. The
            print file is clipped separately, server-side. Drop shadow follows
            the arch (it is the shadow of the clipped shape). */}
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
        />

        {/* red cut line + dimension guides, above the artwork */}
        <svg
          viewBox={`0 0 ${boardW} ${boardH}`}
          style={{
            position: "absolute",
            inset: 0,
            width: boardW,
            height: boardH,
            maxWidth: "none",
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
