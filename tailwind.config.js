/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/index.html", "./app/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        creme: "#fdfbf7", sage: "#81a9a3", "sage-deep": "#6f948d",
        "sage-light": "#9dd0c8", ink: "#33474a", muted: "#8a9694",
      },
    },
  },
  plugins: [],
};
