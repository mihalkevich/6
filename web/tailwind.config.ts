import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wb: {
          purple: "#6B14D0",
          pink: "#CB11AB",
          light: "#F5F0FF",
          dark: "#1A1A2E",
        },
      },
    },
  },
  plugins: [],
};
export default config;
