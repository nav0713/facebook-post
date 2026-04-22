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
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "serif"],
      },
      colors: {
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e0be6a",
          dark: "#a07830",
        },
        ink: {
          50: "#f0ede6",
          100: "#c5c0b4",
          200: "#a09880",
          300: "#7a7468",
          400: "#5a5548",
          500: "#4a4740",
          600: "#3a3730",
          700: "#2a2820",
          800: "#1e1c14",
          900: "#0f0e0a",
          950: "#080806",
        },
      },
      animation: {
        "bounce-slow": "bounce 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
