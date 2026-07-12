import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import App from "./App";
import "./index.css";

// Précharge les polices de marque Erode pour que l'aperçu/export canvas
// les affiche dès le premier rendu (sinon repli Georgia le temps du chargement).
if (typeof document !== "undefined" && "fonts" in document) {
  for (const f of ["Erode", "Erode Medium", "Erode Semibold", "Erode Medium Italic"]) {
    document.fonts.load(`600 40px "${f}"`).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
