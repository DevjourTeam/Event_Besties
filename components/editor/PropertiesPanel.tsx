"use client";

export type ActiveProps = {
  type: string;
  isText: boolean;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
};

type Handlers = {
  setWidth: (n: number) => void;
  setHeight: (n: number) => void;
  setAngle: (n: number) => void;
  setOpacity: (n: number) => void;
  setFontSize: (n: number) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  duplicate: () => void;
  remove: () => void;
};

type Props = {
  active: ActiveProps;
  handlers: Handlers;
};

export function PropertiesPanel({ active, handlers }: Props) {
  return (
    <div className="p-4 space-y-5">
      <Card title="Transform">
        <Row>
          <NumField label="W" value={active.width} onChange={handlers.setWidth} />
          <NumField label="H" value={active.height} onChange={handlers.setHeight} />
        </Row>
        <NumField label="Angle" value={active.angle} onChange={handlers.setAngle} />
        <div>
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
            <span>Opacity</span>
            <span>{Math.round(active.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(active.opacity * 100)}
            onChange={(e) => handlers.setOpacity(Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
      </Card>

      {active.isText && (
        <Card title="Text">
          <NumField
            label="Font size"
            value={active.fontSize ?? 16}
            onChange={handlers.setFontSize}
          />
          <Row>
            <ToggleBtn
              active={active.fontWeight === "bold"}
              onClick={handlers.toggleBold}
              label="Bold"
            >
              <span className="font-bold text-[13px]">B</span>
            </ToggleBtn>
            <ToggleBtn
              active={active.fontStyle === "italic"}
              onClick={handlers.toggleItalic}
              label="Italic"
            >
              <span className="italic font-serif-display text-[13px]">I</span>
            </ToggleBtn>
          </Row>
        </Card>
      )}

      <Card title="Layer">
        <div className="grid grid-cols-2 gap-1.5">
          <LayerBtn onClick={handlers.bringForward} label="Forward">↑</LayerBtn>
          <LayerBtn onClick={handlers.sendBackward} label="Backward">↓</LayerBtn>
          <LayerBtn onClick={handlers.duplicate} label="Duplicate">⧉</LayerBtn>
          <LayerBtn onClick={handlers.remove} label="Delete" danger>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </LayerBtn>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block flex-1">
      <div className="text-[10px] text-text-muted mb-1">{label}</div>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full h-8 px-2 rounded-md border border-card-border bg-form-surface text-[12px]"
      />
    </label>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`w-8 h-8 rounded-md border ${
        active
          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
          : "bg-white text-[#1a1a1a] border-card-border hover:bg-form-surface"
      }`}
    >
      {children}
    </button>
  );
}

function LayerBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`h-9 inline-flex items-center justify-center rounded-md border bg-white text-[14px] ${
        danger
          ? "border-card-border text-[#1a1a1a] hover:bg-[#fbe9e9] hover:text-[#a83232] hover:border-[#f1cccc]"
          : "border-card-border text-[#1a1a1a] hover:bg-form-surface"
      }`}
    >
      {children}
    </button>
  );
}
