import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
export default function ThemeToggle() {
  const {theme, toggleTheme} = useTheme();
  const label = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;
  return <button type="button" onClick={toggleTheme} aria-label={label} title={label}
    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200">
    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === "dark" ? "Light" : "Dark"}</span>
  </button>;
}
