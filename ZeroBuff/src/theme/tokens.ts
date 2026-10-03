// Single source of truth for design tokens.
// No hex literals are allowed anywhere else in the codebase.
// Keep these names identical to the color styles in Figma.

export const colors = {
  // Surfaces (depth comes from these steps + border, not from shadows)
  bg: "#17120F",
  surface: "#1F1914",
  surfaceRaised: "#272019",
  border: "#342B23",

  // Text
  textPrimary: "#F2EAE0",
  textSecondary: "#A89B8C",
  textDisabled: "#6E6459",

  // Accent (primary CTA, active state, progression highlight)
  accent: "#B9714F",
  accentPressed: "#9C5C3E",
  onAccent: "#17120F", // text/icons on accent fills

  // States (always pair with an icon or text, never color alone)
  success: "#8AA07A",
  danger: "#C96A5E",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const typography = {
  fontFamily: {
    body: "WorkSans_400Regular",
    bodyMedium: "WorkSans_500Medium",
    bodySemiBold: "WorkSans_600SemiBold",
    bodyBold: "WorkSans_700Bold",
    numeric: "Oswald_500Medium",
    numericBold: "Oswald_700Bold",
  },
  size: {
    caption: 12,
    body: 16,
    title: 32,
  },
} as const;

// Gym usability: minimum touch area for every interactive control (pt).
export const touch = {
  minTarget: 48,
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
