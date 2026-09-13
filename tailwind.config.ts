import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Ekran yo'nalishi bo'yicha variantlar: bo'lingan ekran (2–3 o'yinchi)
      // telefonda (portrait) ustma-ust, keng ekranda (landscape) yonma-yon.
      // Tartib muhim: `landscape` keyinroq yoziladi — ustun bo'lsa shu g'olib.
      screens: {
        portrait: { raw: "(orientation: portrait)" },
        landscape: { raw: "(orientation: landscape)" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
