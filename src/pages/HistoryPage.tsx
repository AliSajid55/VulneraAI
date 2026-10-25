import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, History, ScanSearch, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import { api, downloadFile } from "../lib/api";
import { formatDateTime, languageLabel } from "../lib/format";
import type { ScanListResponse } from "../types";
import {
  Alert, Button, Card, ConfidenceBar, EmptyState, Input,
  PageHeader, PredictionBadge, Segmented, Select, Skeleton, useToast,
} from "../components/ui";

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const q = params.get("q") ?? "";
  const prediction = params.get("prediction") ?? "";
  const language = params.get("language") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const [searchText, setSearchText] = useState(q);
  const [data, setData] = useState<ScanListResponse | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const filterQuery = () => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (prediction) query.set("prediction", prediction);
    if (language) query.set("language", language);
    if (sort) query.set("sort", sort);
    return query;
  };

  const load = useCallback(() => {
    const query = filterQuery();
    query.set("page", String(page));
    query.set("page_size", String(PAGE_SIZE));

    api<ScanListResponse>(`/api/scans?${query}`)
      .then((result) => { setData(result); setError(""); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load history."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, prediction, language, sort, page]);

  useEffect(load, [load]);

  // Debounced search box -> URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== q) updateParam("q", searchText);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  const deleteScan = async (id: number) => {
    if (!window.confirm(`Delete scan #${id}? This cannot be undone.`)) return;
    try {
      await api(`/api/scans/${id}`, { method: "DELETE" });
      toast(`Scan #${id} deleted.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete scan.");
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile(`/api/scans/export.csv?${filterQuery()}`, "polyguard-scans.csv");
      toast("CSV export downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Boolean(q || prediction || language);

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Scan history"
        subtitle="Search, filter and review all your saved scans."
        action={
          <Button variant="secondary" onClick={exportCsv} loading={exporting} disabled={!data?.total}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center">
          <Segmented
            ariaLabel="Filter by result"
            value={(prediction || "all") as "all" | "vulnerable" | "safe"}
            onChange={(v) => updateParam("prediction", v === "all" ? "" : v)}
            options={[
              { value: "all", label: "All" },
              { value: "vulnerable", label: <><ShieldAlert size={13} className="text-rose-300" /> Vulnerable</> },
              { value: "safe", label: <><ShieldCheck size={13} className="text-emerald-300" /> Safe</> },
            ]}
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_170px_170px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name or code..." className="pl-9" aria-label="Search scans" />
          </div>
          <Select value={language} onChange={(e) => updateParam("language", e.target.value)} aria-label="Filter by language">
            <option value="">All languages</option>
            {data?.languages.map((lang) => (
              <option key={lang} value={lang}>{languageLabel(lang)}</option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => updateParam("sort", e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="confidence">Highest confidence</option>
          </Select>
          </div>
        </div>

        {error && <div className="p-4"><Alert>{error}</Alert></div>}

        {!data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data.scans.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={<Search size={24} />} title="No matching scans"
              text="Try a different search or clear the filters."
              action={<Button variant="secondary" onClick={() => { setSearchText(""); setParams({}, { replace: true }); }}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={<History size={24} />} title="No scans yet"
              text="Your scans will appear here after you run them."
              action={<Link to="/scan"><Button><ScanSearch size={16} /> New scan</Button></Link>} />
          )
        ) : (
          <>
            {/* Table (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-white/[0.015] text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Scan</th>
                    <th className="px-3 py-3 font-medium">Result</th>
                    <th className="px-3 py-3 font-medium">Confidence</th>
                    <th className="px-3 py-3 font-medium">Language</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {data.scans.map((scan) => (
                    <tr key={scan.id} onClick={() => navigate(`/history/${scan.id}`)}
                      className="group cursor-pointer transition hover:bg-white/[0.025]">
                      <td className="max-w-xs px-5 py-3.5">
                        <p className="truncate font-medium text-slate-100 group-hover:text-white">{scan.title}</p>
                        <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                          #{scan.id} · {scan.total_lines} lines · {scan.code_preview}
                        </p>
                      </td>
                      <td className="px-3 py-3.5"><PredictionBadge prediction={scan.prediction} /></td>
                      <td className="px-3 py-3.5"><ConfidenceBar value={scan.confidence} prediction={scan.prediction} /></td>
                      <td className="px-3 py-3.5 text-slate-300">{languageLabel(scan.language)}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-400">{formatDateTime(scan.created_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); deleteScan(scan.id); }}
                          className="rounded-lg p-2 text-slate-600 opacity-60 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                          aria-label={`Delete scan ${scan.id}`} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <ul className="divide-y divide-white/[0.05] md:hidden">
              {data.scans.map((scan) => (
                <li key={scan.id}>
                  <Link to={`/history/${scan.id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-medium text-slate-100">{scan.title}</p>
                      <PredictionBadge prediction={scan.prediction} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {languageLabel(scan.language)} · {Math.round(scan.confidence * 100)}% · {formatDateTime(scan.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-sm text-slate-400">
              <span>
                {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" disabled={data.page <= 1}
                  onClick={() => updateParam("page", String(data.page - 1))} aria-label="Previous page">
                  <ChevronLeft size={16} />
                </Button>
                <span className="tabular-nums">Page {data.page} / {data.pages}</span>
                <Button variant="ghost" disabled={data.page >= data.pages}
                  onClick={() => updateParam("page", String(data.page + 1))} aria-label="Next page">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
