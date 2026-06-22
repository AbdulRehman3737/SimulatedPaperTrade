import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/trades", label: "Trade History" },
  { to: "/settings", label: "Strategy Settings" },
];

export function NavBar(): JSX.Element {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-lg font-bold text-slate-100">
          Crypto Paper Trading <span className="text-emerald-400">Bot</span>
        </span>
        <nav className="flex gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-emerald-900/60 text-emerald-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`
              }
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
