import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        hairline: "var(--hairline)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        moon: "var(--moon)",
        "moon-body": "var(--moon-body)",
        "btn-ink": "var(--btn-ink)",
        star: "var(--star)",
        crater: "var(--crater)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
