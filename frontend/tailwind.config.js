/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canopy: "#00D084",
        moss: "#8993A0",
        leaf: "#1EE39A",
        sun: "#F3C969",
        soil: "#C6CED8",
        paper: "#03070A",
        ink: "#F4F7FB",
        mist: "#151B22",
        berry: "#FF5C7A"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.34)"
      }
    },
  },
  plugins: [],
};
