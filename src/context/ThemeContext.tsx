import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
type Theme = "light" | "dark";
const Context = createContext<{theme: Theme; toggleTheme: () => void} | null>(null);
function initialTheme(): Theme {
  try { const saved = localStorage.getItem("polyguard_theme"); if (saved === "light" || saved === "dark") return saved; } catch { /* Storage blocked. */ }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
export function ThemeProvider({children}: {children: ReactNode}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("polyguard_theme", theme); } catch { /* Keep in memory. */ }
  }, [theme]);
  return <Context.Provider value={{theme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark")}}>{children}</Context.Provider>;
}
export function useTheme() { const context = useContext(Context); if (!context) throw new Error("ThemeProvider is required"); return context; }
