/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#050608", // very dark charcoal
          subtle: "#0b0e13",
          muted: "#11151d",
        },
        surface: {
          DEFAULT: "#151922",
          soft: "#1c2130",
        },
        border: {
          subtle: "#262a36",
        },
        text: {
          DEFAULT: "#e5e7eb",
          muted: "#9ca3af",
          soft: "#d1d5db",
        },
        accent: {
          DEFAULT: "#d1a35f", // muted amber / bronze
          soft: "#b38342",
          subtle: "#7a5530",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Inter", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        "soft-elevated":
          "0 18px 40px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};

