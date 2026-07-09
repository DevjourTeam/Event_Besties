export default function EditorNotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cream text-[#1a1a1a] px-6 text-center">
      <div className="max-w-sm">
        <div className="font-serif-display italic text-[28px]">Event Besties</div>
        <div className="mt-2 text-[10px] tracking-[0.18em] uppercase text-text-muted">
          Editor
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-text-muted">
          We couldn&rsquo;t find a customizable design for this product. It
          may not be configured yet, or the link may be incorrect.
        </p>
      </div>
    </div>
  );
}
