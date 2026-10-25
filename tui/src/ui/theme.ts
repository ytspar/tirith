// Design tokens vendored from @enrichlayer/tui-kit (ADR-0013), same as claude-tabs.

export const theme = {
  brand: '#869978', // titles, headers, selection accent (legible green on dark)
  accent: '#fa4b9a', // non-status highlights (IDs, callouts)
  success: '#6b9b7a',
  warning: '#c4a35a',
  danger: '#c07070',
  info: '#7a9cbf', // informational / in-progress (blue)
  text: '#ffffff', // primary foreground
  muted: '#a1a1aa', // de-emphasised text / inactive glyphs
  border: '#4d4d4d', // card/panel frame
} as const;

export type ThemeRole = keyof typeof theme;
