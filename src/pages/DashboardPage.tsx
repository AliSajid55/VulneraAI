import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Code2,
  FileText,
  Gauge,
  PieChart,
  Plus,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { api } from "../lib/api";
import { formatRelative, languageLabel, percent } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import type { Stats } from "../types";
import { EXAMPLES } from "../lib/examples";
import { DailyActivityChart, DonutChart, LanguageBreakdown, Sparkline } from "../components/charts";
import {
  Alert, Button, Card, CardHeader, ConfidenceBar, PageHeader,
  PredictionBadge, Skeleton, StatCard,
} from "../components/ui";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stats>("/api/stats")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stats."));
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const header = (
    <PageHeader
      eyebrow={today}
      title={`${greeting()}, ${firstName}`}
      subtitle="Here's an overview of your code scans and results."
      action={
        <>
          <Link to="/history"><Button variant="secondary"><Clock size={15} /> History</Button></Link>
          <Link to="/scan"><Button><Plus size={16} /> New scan</Button></Link>
        </>
      }
    />
  );

  if (error) return (<>{header}<Alert>{error}</Alert></>);
  if (!stats) return (<>{header}<DashboardSkeleton /></>);

  const daily = stats.daily.map((d) => d.total);
  const dailyVuln = stats.daily.map((d) => d.vulnerable);
  const dailySafe = stats.daily.map((d) => d.total - d.vulnerable);

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total scans" value={String(stats.total_scans)}
          hint={`${stats.total_lines.toLocaleString()} lines analyzed`} icon={<Activity size={16} />}
          chart={<Sparkline values={daily} color="#818cf8" />} />
        <StatCard label="Vulnerable" value={String(stats.vulnerable_scans)} accent="rose"
          hint={`${percent(stats.vulnerable_rate)} of all scans`} icon={<ShieldAlert size={16} />}
          chart={<Sparkline values={dailyVuln} color="#fb7185" />} />
        <StatCard label="Safe" value={String(stats.safe_scans)} accent="emerald"
          hint={`${percent(stats.total_scans ? 1 - stats.vulnerable_rate : 0)} of all scans`}
          icon={<ShieldCheck size={16} />} chart={<Sparkline values={dailySafe} color="#34d399" />} />
        <StatCard label="Avg. confidence" value={percent(stats.average_confidence)} accent="amber"
          hint="Avg. distance from the threshold" icon={<Gauge size={16} />} />
      </div>

      {stats.total_scans === 0 ? (
        <GettingStarted />
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Scan activity" subtitle="Last 14 days" icon={<BarChart3 size={15} />}
                action={<LegendDots />} />
              <div className="p-5"><DailyActivityChart data={stats.daily} /></div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Results" subtitle="Safe vs vulnerable" icon={<PieChart size={15} />} />
              <div className="p-6"><DonutChart safe={stats.safe_scans} vulnerable={stats.vulnerable_scans} /></div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Recent scans"
                subtitle="Your latest five scans"
                icon={<Clock size={15} />}
                action={
                  <Link to="/history" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200">
                    View all <ArrowRight size={13} />
                  </Link>
                }
              />
              <ul className="divide-y divide-white/[0.05]">
                {stats.recent.map((scan) => (
                  <li key={scan.id}>
                    <Link to={`/history/${scan.id}`}
                      className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                        scan.prediction === "vulnerable"
                          ? "bg-rose-500/10 text-rose-300 ring-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"}`}>
                        {scan.prediction === "vulnerable" ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">{scan.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {languageLabel(scan.language)} · {scan.total_lines} lines · {formatRelative(scan.created_at)}
                        </p>
                      </div>
                      <div className="hidden sm:block"><ConfidenceBar value={scan.confidence} prediction={scan.prediction} /></div>
                      <PredictionBadge prediction={scan.prediction} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="By language" subtitle="Scans per language" icon={<Code2 size={15} />} />
              <div className="p-5"><LanguageBreakdown data={stats.by_language} /></div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function LegendDots() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-400">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Vulnerable</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Safe</span>
    </div>
  );
}

function GettingStarted() {
  const steps = [
    { icon: Code2, title: "Paste your code", text: "Add a snippet in Python, JavaScript, Java, C/C++, Go and more." },
    { icon: Sparkles, title: "Get a verdict", text: "GraphCodeBERT classifies it, and Gemini explains why with suggested fixes." },
    { icon: FileText, title: "Track and export", text: "Every scan is saved to your history, with PDF and CSV export." },
  ];

  return (
    <Card className="relative mt-6 overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative grid gap-8 p-6 lg:grid-cols-5 lg:p-8">
        <div className="lg:col-span-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
            <Sparkles size={12} /> Getting started
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">Run your first scan</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your dashboard fills up with charts and history as you scan. Try one of the examples
            to see how it works.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/scan"><Button><ScanSearch size={16} /> Start scanning</Button></Link>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-slate-500">Or try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.slice(0, 3).map((example) => (
                <Link key={example.id} to={`/scan?example=${example.id}`}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/40 hover:text-white">
                  {example.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <ol className="grid gap-3 lg:col-span-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                <step.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">
                  <span className="mr-2 font-mono text-xs text-slate-500">0{index + 1}</span>{step.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-5 h-8 w-16" />
            <Skeleton className="mt-3 h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3"><Skeleton className="h-52 w-full" /></Card>
        <Card className="p-5 lg:col-span-2"><Skeleton className="h-52 w-full" /></Card>
      </div>
    </>
  );
}
