import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        noma: {
          black: "#0f0f0f",
          gold: "#c9a84c",
          goldLight: "#e8d5a3",
          cream: "#f5f0e8",
          white: "#ffffff",
        }
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.08)",
        soft: "0 18px 60px rgba(0,0,0,0.10)"
      }
    }
  },
  plugins: []
};

export default config;
