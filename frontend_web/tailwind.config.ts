import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08111f",
          900: "#0e1a2d",
          800: "#13233a",
        },
        glow: {
          mint: "#4de2b1",
          lime: "#c7ff6b",
          ember: "#ff8e4d",
          mist: "#edf6f3",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Aptos"', '"Segoe UI"', "sans-serif"],
        sans: ['"Space Grotesk"', '"Aptos"', '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 60px rgba(8, 17, 31, 0.16)",
        soft: "0 16px 32px rgba(13, 30, 38, 0.08)",
      },
      backgroundImage: {
        "mesh-lime":
          "radial-gradient(circle at top left, rgba(199,255,107,0.22), transparent 34%), radial-gradient(circle at top right, rgba(77,226,177,0.18), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.98), rgba(238,246,243,0.92))",
      },
      keyframes: {
        floatIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(18px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "float-in": "floatIn 520ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
