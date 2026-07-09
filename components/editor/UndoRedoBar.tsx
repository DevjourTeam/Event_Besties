"use client";

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function UndoRedoBar({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn label="Undo" disabled={!canUndo} onClick={onUndo}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </svg>
      </IconBtn>
      <IconBtn label="Redo" disabled={!canRedo} onClick={onRedo}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H10a6 6 0 0 0 0 12h3" />
        </svg>
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-card-border bg-white text-[#1a1a1a] hover:bg-form-surface disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
