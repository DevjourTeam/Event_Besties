import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f0ede5",
        sidebar: "#242018",
        "sidebar-hover": "#2e2820",
        gold: "#c8a96e",
        "gold-hover": "#b8996e",
        "card-border": "#e5e0d8",
        "form-surface": "#f8f5f0",
        "text-muted": "#8a8070",
        "code-bg": "#1a1814",
        "code-text": "#a8c488",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
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
