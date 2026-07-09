import type { Config } from "tailwindcss";

/**
 * Palette + type matched to the custom designer (components/editor/canvas/
 * styles/tokens.css): cool navy ink, muted gold, neutral grays, Playfair
 * Display headings + Jost UI. The admin dashboard and template editor reskin
 * entirely from these tokens.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f4f5f7", // page background (neutral, was warm cream)
        stage: "#e9e9ed", // editor stage gray
        sidebar: "#1b2333", // navy ink (was dark brown)
        "sidebar-hover": "#2a3346",
        gold: "#a98b52",
        "gold-hover": "#977a45",
        "gold-soft": "#f3eddf",
        ink: "#1b2333",
        "ink-2": "#3a4252",
        "card-border": "#e2e2e6",
        "form-surface": "#f6f6f8",
        "text-muted": "#9a9aa3",
        "code-bg": "#161d2b",
        "code-text": "#cbd5e6",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-jost)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
