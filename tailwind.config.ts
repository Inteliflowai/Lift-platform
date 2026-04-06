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
        primary: "#6366f1",
        success: "#10b981",
        warning: "#f59e0b",
        review: "#f43f5e",
        sidebar: "#1e1b2e",
        "page-bg": "#f8f8fa",
        surface: "#ffffff",
        "lift-border": "#e5e5e5",
        "lift-text": "#1a1a2e",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
export default config;
