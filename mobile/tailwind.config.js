/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Surfaces (depth comes from these steps + border, not from shadows)
        bg: "#17120F",
        surface: "#1F1914",
        "surface-raised": "#272019",
        border: "#342B23",

        // Text
        "text-primary": "#F2EAE0",
        "text-secondary": "#A89B8C",
        "text-disabled": "#6E6459",

        // Accent (primary CTA, active state, progression highlight)
        accent: "#B9714F",
        "accent-pressed": "#9C5C3E",
        "on-accent": "#17120F",

        // States (always pair with an icon or text, never color alone)
        success: "#8AA07A",
        danger: "#C96A5E",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
      fontFamily: {
        body: ["WorkSans_400Regular"],
        "body-medium": ["WorkSans_500Medium"],
        "body-semibold": ["WorkSans_600SemiBold"],
        "body-bold": ["WorkSans_700Bold"],
        numeric: ["Oswald_500Medium"],
        "numeric-bold": ["Oswald_700Bold"],
      },
      fontSize: {
        caption: "12px",
        sm: "14px",
        body: "16px",
        xl: "20px",
        title: "32px",
      },
    },
  },
  plugins: [],
};
