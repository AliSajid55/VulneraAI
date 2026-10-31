import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = `Switch to ${dark ? "light" : "dark"} theme`;
  return (
    <button type="button" onClick={toggleTheme} aria-label={label} title={label}
      aria-pressed={dark}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral/10 bg-ink-900 px-2.5 text-slate-400 shadow-sm transition hover:border-neutral/20 hover:bg-ink-850 hover:text-foreground">
      {dark ? <Moon size={15} /> : <Sun size={15} />}
      <span className="hidden text-xs font-medium sm:inline">{dark ? "Dark" : "Light"}</span>
    </button>
  );
}