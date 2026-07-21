import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        bg:      "#0F172A",
        surface: "#1E293B",
        border:  "#334155",
        muted:   "#64748B",
        soft:    "#94A3B8",
        text:    "#F8FAFC",
        accent:  "#38BDF8",
        "accent-dim": "#0EA5E9",
        danger:  "#F87171",
        success: "#4ADE80",
      },
      keyframes: {
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s ease-out",
        "fade-in":  "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
