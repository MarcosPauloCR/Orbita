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
        "surface-strong": "var(--surface-strong)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        moon: "var(--moon)",
        "moon-body": "var(--moon-body)",
        "btn-ink": "var(--btn-ink)",
        star: "var(--star)",
        crater: "var(--crater)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
