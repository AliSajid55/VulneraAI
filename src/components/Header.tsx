import React from 'react';
import { Sun, Moon, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: 'scan' | 'history';
  setActiveTab: (tab: 'scan' | 'history') => void;
  historyCount: number;
}

export default function Header({ activeTab, setActiveTab, historyCount }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-indigo-700 dark:bg-gray-900 border-b border-indigo-600 dark:border-gray-700 shadow-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-indigo-500 p-2 rounded-lg shadow">
              <ShieldCheck size={22} className="text-indigo-700 dark:text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold leading-tight tracking-tight">
                Vulnerability Scanner
              </h1>
              <p className="text-indigo-200 dark:text-gray-400 text-xs mt-0.5">
                Paste your code and let the model do the rest
              </p>
            </div>
          </div>

          {/* Nav + theme toggle */}
          <div className="flex items-center gap-3">
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === 'scan'
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-indigo-100 hover:bg-indigo-600 dark:hover:bg-gray-700'
                }`}
              >
                Scan Code
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-indigo-100 hover:bg-indigo-600 dark:hover:bg-gray-700'
                }`}
              >
                History
                {historyCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                    {historyCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-indigo-100 hover:bg-indigo-600 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
