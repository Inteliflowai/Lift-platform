import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#14b8a6",
        success: "#34d399",
        warning: "#f59e0b",
        review: "#f87171",
        sidebar: "#0a1419",
        "page-bg": "#0d1117",
        surface: "#161b22",
        "lift-border": "#2d333b",
        "lift-text": "#f1f5f9",
        muted: "#94a3b8",
        cyan: "#22d3ee",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
