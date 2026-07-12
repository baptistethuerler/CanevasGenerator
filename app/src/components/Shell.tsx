import type { ReactNode } from "react";

type NavKey = "creations" | "planning" | "marque";

const NAV: { k: NavKey; label: string; icon: ReactNode }[] = [
  {
    k: "creations",
    label: "Créations",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </>
    ),
  },
  {
    k: "planning",
    label: "Planning",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </>
    ),
  },
  {
    k: "marque",
    label: "Marque",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="9" r="1.4" />
        <circle cx="15" cy="9" r="1.4" />
        <circle cx="9.5" cy="15" r="1.4" />
      </>
    ),
  },
];

export function Shell({
  children,
  active = "creations",
  title,
  actions,
}: {
  children: ReactNode;
  active?: NavKey;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/brand/logo-altitude-white.png" alt="Altitude Massage" />
        </div>
        {NAV.map((n) => (
          <button key={n.k} type="button" className={`nav-item${n.k === active ? " active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {n.icon}
            </svg>
            {n.label}
          </button>
        ))}
        <div className="spacer" />
        <div className="nav-foot">Altitude Massage<br />Stories &amp; posts Instagram</div>
      </aside>
      <div className="content">
        <header className="topbar">
          {title && <h1>{title}</h1>}
          <div className="top-actions">{actions}</div>
          <div className="me">
            <div className="av">AM</div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
