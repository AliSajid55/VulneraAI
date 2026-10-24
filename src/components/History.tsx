import React, { useState } from 'react';
import { HistoryIcon, Trash2, AlertCircle, ShieldCheck, Code, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { HistoryEntry, RiskLevel } from '../types';

export default function ScanHistory() {
  const { theme } = useTheme();

  const [entries, setEntries] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('scanHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const clearHistory = () => {
    if (confirm('This will remove all your saved scans. Are you sure?')) {
      setEntries([]);
      localStorage.removeItem('scanHistory');
    }
  };

  const formatDate = (timestamp: string): string =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const riskBadge = (risk: RiskLevel): string => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high':     return 'bg-orange-500 text-white';
      case 'medium':   return 'bg-yellow-500 text-white';
      case 'low':      return 'bg-green-500 text-white';
      default:         return 'bg-gray-500 text-white';
    }
  };

  const riskIcon = (risk: RiskLevel) => {
    if (risk === 'critical' || risk === 'high')
      return <AlertCircle size={20} className="text-red-400" />;
    if (risk === 'low')
      return <ShieldCheck size={20} className="text-green-400" />;
    return <AlertCircle size={20} className="text-yellow-400" />;
  };

  // theme-aware classes
  const surface    = theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300';
  const subSurface = theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100';
  const labelText  = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const mutedText  = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <HistoryIcon size={36} className={mutedText} />
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${labelText}`}>Nothing here yet</h2>
        <p className={`text-sm mb-6 max-w-sm ${mutedText}`}>
          Every time you scan a snippet the result gets saved here so you can come back to it later.
        </p>
        <div className={`flex items-center gap-2 text-sm ${mutedText}`}>
          <CheckCircle size={15} />
          <span>Saved locally in your browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <HistoryIcon size={22} className="text-white" />
          </div>
          <h2 className={`text-xl font-bold ${labelText}`}>Past Scans</h2>
          <span className={`text-sm px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
            {entries.length}
          </span>
        </div>

        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
        >
          <Trash2 size={15} />
          Clear all
        </button>
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-4">
        {entries.map((entry, idx) => (
          <div
            key={entry.id ?? idx}
            className={`rounded-lg border shadow-sm transition-all ${surface}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">

                {/* Risk icon */}
                <div className={`p-3 rounded-lg shrink-0 ${entry.overallRisk === 'low' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                  {riskIcon(entry.overallRisk)}
                </div>

                <div className="flex-1 min-w-0">

                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-base font-semibold ${labelText}`}>
                      Scan #{entry.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${riskBadge(entry.overallRisk)}`}>
                      {entry.overallRisk?.toUpperCase() ?? 'UNKNOWN'}
                    </span>
                    <span className={`text-xs ${mutedText}`}>{formatDate(entry.timestamp)}</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-2 rounded ${subSurface}`}>
                      <p className={`text-xs mb-1 ${mutedText}`}>Language</p>
                      <div className="flex items-center gap-1.5">
                        <Code size={13} className="text-blue-400" />
                        <span className={`text-sm font-medium capitalize ${labelText}`}>
                          {entry.language || 'auto'}
                        </span>
                      </div>
                    </div>
                    <div className={`p-2 rounded ${subSurface}`}>
                      <p className={`text-xs mb-1 ${mutedText}`}>Lines scanned</p>
                      <span className={`text-sm font-medium ${labelText}`}>
                        {entry.codeLines ?? 0}
                      </span>
                    </div>
                    <div className={`p-2 rounded ${subSurface}`}>
                      <p className={`text-xs mb-1 ${mutedText}`}>Issues found</p>
                      <span className={`text-sm font-medium ${entry.vulnerabilitiesFound > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {entry.vulnerabilitiesFound ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Code preview */}
                  {entry.codePreview && (
                    <div className="mt-3">
                      <p className={`text-xs mb-1 ${mutedText}`}>Preview</p>
                      <div className={`p-2 rounded text-xs font-mono overflow-hidden whitespace-nowrap text-ellipsis ${subSurface} ${labelText}`}>
                        {entry.codePreview}
                      </div>
                    </div>
                  )}

                  {/* Issue list */}
                  {entry.sampleVulnerabilities?.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      <p className={`text-xs ${mutedText}`}>Issues at a glance</p>
                      {entry.sampleVulnerabilities.map((v, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${labelText}`}>
                          <AlertCircle size={11} className="text-red-400 shrink-0" />
                          <span>{v.vulnerabilityType} on line {v.line}</span>
                        </div>
                      ))}
                      {entry.vulnerabilitiesFound > entry.sampleVulnerabilities.length && (
                        <p className={`text-xs ml-4 ${mutedText}`}>
                          and {entry.vulnerabilitiesFound - entry.sampleVulnerabilities.length} more
                        </p>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
