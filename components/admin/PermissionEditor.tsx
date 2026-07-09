"use client";

import { type SvgElementInfo, deriveLabel } from "@/lib/svg-parser";
import type { ElementPermission, PermissionType } from "@/lib/types";

type Permissions = Record<string, ElementPermission>;

type Props = {
  elements: SvgElementInfo[];
  permissions: Permissions;
  onChange: (next: Permissions) => void;
};

/**
 * Permission editor — every element starts LOCKED.
 * Toggle buttons let the admin promote individual elements to TEXT or COLOR.
 *  - LOCKED: customer cannot interact
 *  - TEXT  : customer may replace textContent (no font/size/position/color change)
 *  - COLOR : customer may change fill (no position/shape change)
 */
export function PermissionEditor({ elements, permissions, onChange }: Props) {
  if (elements.length === 0) {
    return (
      <div className="bg-form-surface border border-card-border rounded-card p-4 text-[12px] text-text-muted">
        No named elements found. Re-export from Illustrator with each layer named.
      </div>
    );
  }

  const setType = (id: string, type: PermissionType) => {
    const existing = permissions[id];
    const next: Permissions = { ...permissions };
    next[id] = {
      type,
      label: existing?.label ?? deriveLabel(id),
      locked: type === "locked",
    };
    onChange(next);
  };

  const setLabel = (id: string, label: string) => {
    const existing = permissions[id];
    const next: Permissions = { ...permissions };
    next[id] = {
      type: existing?.type ?? "locked",
      label,
      locked: existing?.type ? existing.type === "locked" : true,
    };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {elements.map((el) => {
        const current = permissions[el.id]?.type ?? "locked";
        const labelValue = permissions[el.id]?.label ?? deriveLabel(el.id);
        const showText = el.isText;
        const showColor = el.hasFillAttr;

        return (
          <div
            key={el.id}
            className="bg-white border border-card-border rounded-lg px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <TagBadge tag={el.tagName} isText={el.isText} />
              <code className="text-[11px] text-[#1a1a1a] font-mono truncate">
                #{el.id}
              </code>
            </div>

            {el.isText && el.textContent && (
              <div className="mt-1 text-[11px] text-text-muted truncate">
                &ldquo;{el.textContent.slice(0, 24)}
                {el.textContent.length > 24 ? "…" : ""}&rdquo;
              </div>
            )}

            <div className="mt-2 flex items-center gap-1.5">
              <ToggleBtn
                kind="locked"
                active={current === "locked"}
                onClick={() => setType(el.id, "locked")}
              >
                LOCKED
              </ToggleBtn>
              {showText && (
                <ToggleBtn
                  kind="text"
                  active={current === "text"}
                  onClick={() => setType(el.id, "text")}
                >
                  TEXT
                </ToggleBtn>
              )}
              {showColor && (
                <ToggleBtn
                  kind="color"
                  active={current === "color"}
                  onClick={() => setType(el.id, "color")}
                >
                  COLOR
                </ToggleBtn>
              )}
            </div>

            {current !== "locked" && (
              <input
                type="text"
                value={labelValue}
                onChange={(e) => setLabel(el.id, e.target.value)}
                placeholder="Field label shown to customer"
                className="mt-2 w-full h-8 px-2 rounded-md border border-card-border bg-form-surface text-[11px] focus:outline-none focus:ring-1 focus:ring-gold/50"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TagBadge({ tag, isText }: { tag: string; isText: boolean }) {
  const tone = isText
    ? "bg-[#e8f1fb] text-[#2a5b94] border-[#cbdcef]"
    : "bg-[#f1ebf8] text-[#5b3a8a] border-[#dccdee]";
  return (
    <span
      className={`inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-1.5 py-[2px] rounded border ${tone}`}
    >
      {tag}
    </span>
  );
}

function ToggleBtn({
  kind,
  active,
  onClick,
  children,
}: {
  kind: "locked" | "text" | "color";
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const palette: Record<
    "locked" | "text" | "color",
    { active: string; idle: string }
  > = {
    locked: {
      active: "bg-[#3a3a3a] text-white border-[#3a3a3a]",
      idle: "bg-white text-text-muted border-card-border hover:bg-form-surface",
    },
    text: {
      active: "bg-[#2a5b94] text-white border-[#2a5b94]",
      idle: "bg-white text-[#2a5b94] border-[#cbdcef] hover:bg-[#f4f8fc]",
    },
    color: {
      active: "bg-[#5b3a8a] text-white border-[#5b3a8a]",
      idle: "bg-white text-[#5b3a8a] border-[#dccdee] hover:bg-[#f8f5fc]",
    },
  };
  const cls = active ? palette[kind].active : palette[kind].idle;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 px-2 text-[10px] tracking-[0.08em] uppercase font-bold rounded border ${cls} transition-colors`}
    >
      {children}
    </button>
  );
}
