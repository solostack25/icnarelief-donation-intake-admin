import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f6f54",
          dark: "#154a38",
          light: "#e8f4ee",
        },
      },
    },
  },
  plugins: [],
};
export default config;
