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
  for (const f of ["Erode", "Erode Medium", "Erode Semibold", "Erode Medium Italic", "Erode Semibold Italic"]) {
    document.fonts.load(`600 40px "${f}"`).catch(() => {});
  }
}

// Recharge automatiquement la page quand une nouvelle version de l'interface est déployée
// (après « Lancer.command » qui récupère les nouveautés et reconstruit l'interface).
if (typeof window !== "undefined") {
  let current: string | null = null;
  const check = async () => {
    try {
      const { v } = await fetch("/api/version", { cache: "no-store" }).then((r) => r.json());
      if (current === null) current = v;
      else if (v && v !== current) window.location.reload();
    } catch { /* hors-ligne : on ignore */ }
  };
  check();
  window.addEventListener("focus", check);
  setInterval(check, 30000);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
