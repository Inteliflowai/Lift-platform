export const colors = {
  primary: "#6366f1",
  primaryHover: "#4f46e5",
  primaryLight: "#818cf8",
  success: "#10b981",
  warning: "#f59e0b",
  review: "#f43f5e",
  sidebar: "#1e1b2e",
  sidebarHover: "#2a2740",
  pageBg: "#f8f8fa",
  surface: "#ffffff",
  topBar: "#ffffff",
  border: "#e5e5e5",
  text: "#1a1a2e",
  muted: "#6b7280",
  white: "#ffffff",
  candidateBg: "#faf8f5",
  candidateBorder: "#e8e4df",
  candidateText: "#1c1917",
  candidateMuted: "#78716c",
} as const;

export const fonts = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  mono: "var(--font-geist-mono)",
} as const;

export const spacing = {
  sidebarWidth: 240,
  topBarHeight: 56,
} as const;

export type ColorToken = keyof typeof colors;
