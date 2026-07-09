"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type ToastOptions = {
  message: string;
  duration?: number;
  actions?: ToastAction[];
};

type ToastItem = {
  id: number;
  message: string;
  actions?: ToastAction[];
};

type ToastCtx = {
  show: (messageOrOptions: string | ToastOptions) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((messageOrOptions: string | ToastOptions) => {
    const opts: ToastOptions =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions;
    const id = Date.now() + Math.random();
    const duration = opts.duration ?? (opts.actions?.length ? 8000 : 3000);
    setItems((prev) => [
      ...prev,
      { id, message: opts.message, actions: opts.actions },
    ]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className="bg-[#1a1a1a] text-white text-[12px] px-5 py-[9px] rounded-lg shadow-lg pointer-events-auto max-w-[520px] flex items-center gap-3"
          >
            <span className="flex-1">{t.message}</span>
            {t.actions?.map((a, i) =>
              a.href ? (
                <a
                  key={i}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] underline underline-offset-2 text-gold hover:text-white whitespace-nowrap"
                >
                  {a.label}
                </a>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    a.onClick?.();
                    dismiss(t.id);
                  }}
                  className="text-[11px] underline underline-offset-2 text-gold hover:text-white whitespace-nowrap"
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      show: (m) => {
        if (typeof window !== "undefined") {
          const msg = typeof m === "string" ? m : m.message;
          console.log("[toast]", msg);
        }
      },
    };
  }
  return ctx;
}
