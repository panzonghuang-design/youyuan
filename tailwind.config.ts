import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12081c",
        panel: "rgba(255,255,255,0.5)",
        panelStrong: "rgba(255,255,255,0.7)",
        accent: "#ff6ba6",
        accent2: "#ff9f5f",
        text: "#2d0b2f",
        muted: "#7a4a7c",
        border: "rgba(255,255,255,0.6)",
      },
      boxShadow: {
        glow: "0 12px 40px rgba(255, 107, 166, 0.25)",
        pill: "0 8px 24px rgba(255,107,166,0.35)",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Noto Sans SC"', "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease",
      },
    },
  },
  plugins: [],
};

export default config;
