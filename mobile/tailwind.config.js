/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
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
