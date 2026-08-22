import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D10",
        surface: "#16181D",
        "surface-2": "#1E2128",
        border: "#2A2E36",
        fg: "#F4F5F7",
        muted: "#9AA0A6",
        accent: "#C6F135",
        "on-accent": "#0B0D10",
        danger: "#F97066",
      },
    },
  },
};

export default config;
