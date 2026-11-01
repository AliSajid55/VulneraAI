// Lightweight SVG/CSS charts (no chart library needed).

import { useState } from "react";

import type { DailyCount, LanguageCount } from "../types";
import { languageLabel } from "../lib/format";

const SAFE_COLOR = "#34d399"; // emerald-400
const VULN_COLOR = "#fb7185"; // rose-400

/** Donut showing safe vs vulnerable share. */
export function DonutChart({ safe, vulnerable }: { safe: number; vulnerable: number }) {
  const total = safe + vulnerable;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const vulnerableShare = total ? vulnerable / total : 0;
  const vulnerableLength = circumference * vulnerableShare;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img"
          aria-label={`${vulnerable} vulnerable and ${safe} safe scans`}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="16" />
          {total > 0 && (
            <>
              <circle cx="70" cy="70" r={radius} fill="none" stroke={SAFE_COLOR} strokeWidth="16"
                strokeDasharray={`${circumference - vulnerableLength} ${circumference}`}
                strokeDashoffset={-vulnerableLength} />
              {vulnerable > 0 && (
                <circle cx="70" cy="70" r={radius} fill="none" stroke={VULN_COLOR} strokeWidth="16"
                  strokeDasharray={`${vulnerableLength} ${circumference}`} />
              )}
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-foreground">{total}</span>
          <span className="text-xs text-slate-400">scans</span>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <Legend color={VULN_COLOR} label="Vulnerable" value={vulnerable} total={total} />
        <Legend color={SAFE_COLOR} label="Safe" value={safe} total={total} />
      </div>
    </div>
  );
}

function Legend({ color, label, value, total }: {
  color: string; label: string; value: number; total: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      <span className="w-24 text-slate-300">{label}</span>
      <span className="tabular-nums font-semibold text-slate-100">{value}</span>
      <span className="tabular-nums text-slate-500">
        {total ? `${Math.round((value / total) * 100)}%` : "0%"}
      </span>
    </div>
  );
}

/** Stacked bars: scans per day, split into safe and vulnerable. */
export function DailyActivityChart({ data }: { data: DailyCount[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const active = hovered !== null ? data[hovered] : null;

  return (
    <div>
      <div className="mb-3 h-5 text-xs text-slate-400">
        {active ? (
          <span>
            <span className="text-slate-200">{formatDay(active.date)}</span>
            {" · "}{active.total} scans · {active.vulnerable} vulnerable
          </span>
        ) : (
          <span>Hover a bar to see details</span>
        )}
      </div>

      <div className="flex h-44 items-end gap-1.5" onMouseLeave={() => setHovered(null)}>
        {data.map((day, index) => {
          const safeCount = day.total - day.vulnerable;
          return (
            <div key={day.date} className="flex h-full flex-1 cursor-default flex-col justify-end"
              onMouseEnter={() => setHovered(index)}>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md"
                style={{ height: `${(day.total / max) * 100}%`, minHeight: day.total ? 4 : 0 }}>
                <div style={{ flexGrow: day.vulnerable, background: VULN_COLOR,
                  opacity: hovered === null || hovered === index ? 1 : 0.45 }} />
                <div style={{ flexGrow: safeCount, background: SAFE_COLOR,
                  opacity: hovered === null || hovered === index ? 1 : 0.45 }} />
              </div>
              {!day.total && <div className="h-1 w-full rounded-full bg-neutral/[0.05]" />}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>{data[0] && formatDay(data[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Horizontal bars: scans per language. */
export function LanguageBreakdown({ data }: { data: LanguageCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((row) => (
        <div key={row.language}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-300">{languageLabel(row.language)}</span>
            <span className="tabular-nums text-slate-400">
              {row.total} <span className="text-danger/80">({row.vulnerable} vuln.)</span>
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-neutral/[0.05]">
            <div style={{ width: `${(row.vulnerable / max) * 100}%`, background: VULN_COLOR }} />
            <div style={{ width: `${((row.total - row.vulnerable) / max) * 100}%`, background: SAFE_COLOR }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tiny line chart for stat cards. */
export function Sparkline({
  values,
  color = "#818cf8",
  width = 96,
  height = 32,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
