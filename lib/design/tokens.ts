export const colors = {
  primary: "#6366f1",
  primaryHover: "#818cf8",
  success: "#10b981",
  warning: "#f59e0b",
  review: "#f43f5e",
  sidebar: "#1e1b2e",
  sidebarHover: "#2a2740",
  pageBg: "#0f0f13",
  surface: "#16161f",
  topBar: "#16161f",
  border: "#2a2a3a",
  text: "#e8e8f0",
  muted: "#7878a0",
  white: "#ffffff",
  candidateBg: "#fafaf9",
} as const;

export const spacing = {
  sidebarWidth: 240,
  topBarHeight: 56,
} as const;

export type ColorToken = keyof typeof colors;
