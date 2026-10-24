
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import Scanner from "./components/Scanner";
import ScanHistory from "./components/History";

import type { HistoryEntry } from "./types";
import "./index.css";

type ActiveTab = "scan" | "history";

function App() {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>("scan");
  const [historyCount, setHistoryCount] = useState(0);

  const refreshHistoryCount = () => {
    try {
      const saved = localStorage.getItem("scanHistory");
      const history: unknown = saved ? JSON.parse(saved) : [];

      setHistoryCount(Array.isArray(history) ? history.length : 0);
    } catch (error) {
      console.error("Unable to read scan history:", error);
      setHistoryCount(0);
    }
  };

  useEffect(() => {
    refreshHistoryCount();

    window.addEventListener("storage", refreshHistoryCount);

    // Custom event lets components update the count in this tab.
    window.addEventListener("scanHistoryUpdated", refreshHistoryCount);

    return () => {
      window.removeEventListener("storage", refreshHistoryCount);
      window.removeEventListener(
        "scanHistoryUpdated",
        refreshHistoryCount
      );
    };
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    refreshHistoryCount();
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        historyCount={historyCount}
      />

      <main className="flex-1 overflow-y-auto">
        {activeTab === "scan" ? <Scanner /> : <ScanHistory />}
      </main>
    </div>
  );
}

function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

const container = document.getElementById("root");

if (!container) {
  throw new Error('Could not find the element with id "root" in index.html.');
}

createRoot(container).render(<Root />);
