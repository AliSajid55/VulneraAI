import { useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bot, Cpu, ExternalLink, Eraser, FileCode2, Loader2, ScanSearch, Sparkles, Upload,
} from "lucide-react";

import { api } from "../lib/api";
import { EXAMPLES } from "../lib/examples";
import type { ScanDetail } from "../types";
import ScanResultView from "../components/ScanResultView";
import { Alert, Button, Card, Field, Input, Kbd, PageHeader, Select, cx } from "../components/ui";

const LANGUAGES = ["auto", "python", "javascript", "typescript", "java", "cpp", "c", "go", "swift"];

const LANGUAGE_NAMES: Record<string, string> = {
  auto: "Auto detect", python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  java: "Java", cpp: "C++", c: "C", go: "Go", swift: "Swift",
};

const EXTENSION_LANGUAGE: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", mjs: "javascript", ts: "typescript",
  tsx: "typescript", java: "java", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
  c: "c", h: "c", go: "go", swift: "swift",
};

const MAX_FILE_BYTES = 100_000;
const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

export default function ScanPage() {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Load an example from ?example=<id> (used by the dashboard).
  useEffect(() => {
    const id = params.get("example");
    const example = EXAMPLES.find((e) => e.id === id);
    if (example) {
      loadExample(example.id);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadExample(id: string) {
    const example = EXAMPLES.find((e) => e.id === id);
    if (!example) return;
    setCode(example.code);
    setLanguage(example.language);
    setTitle(example.label);
    setResult(null);
    setError("");
  }

  async function loadFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large. Please use a file under 100 KB.");
      return;
    }
    const text = await file.text();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    setCode(text);
    setTitle(file.name);
    setLanguage(EXTENSION_LANGUAGE[extension] ?? "auto");
    setResult(null);
    setError("");
  }

  const analyzeCode = async () => {
    if (loading) return;
    if (!code.trim()) {
      setError("Please paste some code or upload a file before scanning.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const scan = await api<ScanDetail>("/api/scan", {
        method: "POST",
        body: JSON.stringify({ code, language, title }),
      });
      setResult(scan);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setCode("");
    setTitle("");
    setLanguage("auto");
    setResult(null);
    setError("");
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const lines = code ? code.split("\n").length : 1;

  return (
    <>
      <PageHeader
        eyebrow="Scanner"
        title="New scan"
        subtitle="Paste a snippet or upload a file to check it for potential security risks. Every scan is saved to your history."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <Card className="overflow-hidden">
          {/* Options */}
          <div className="grid gap-4 border-b border-white/[0.06] p-5 sm:grid-cols-[1fr_200px]">
            <Field label="Scan name (optional)">
              <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Login handler, user query function" />
            </Field>
            <Field label="Language">
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>{LANGUAGE_NAMES[item]}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Editor toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/40 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </span>
              <span className="ml-2 flex items-center gap-1.5 font-mono text-xs text-slate-500">
                <FileCode2 size={13} /> {title || "untitled"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input ref={fileInput} type="file" className="hidden"
                accept=".py,.js,.jsx,.mjs,.ts,.tsx,.java,.c,.h,.cpp,.cc,.cxx,.hpp,.go,.swift,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
              <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                <Upload size={14} /> Upload file
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={loading || (!code && !title)}>
                <Eraser size={14} /> Clear
              </Button>
            </div>
          </div>

          {/* Editor with line numbers */}
          <div
            className={cx("relative flex bg-ink-950/60 transition", dragging && "ring-2 ring-inset ring-indigo-400/60")}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div ref={gutter} aria-hidden="true"
              className="h-[380px] select-none overflow-hidden border-r border-white/[0.05] py-4 pl-4 pr-3 text-right font-mono text-[13px] leading-6 text-slate-600">
              {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); if (error) setError(""); }}
              onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); analyzeCode(); }
                if (e.key === "Tab") {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const { selectionStart: s, selectionEnd: end } = el;
                  setCode(code.slice(0, s) + "    " + code.slice(end));
                  requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
                }
              }}
              spellCheck={false}
              aria-label="Code to scan"
              wrap="off"
              placeholder={"Paste code here, or drag and drop a file..."}
              className="h-[380px] w-full resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-slate-100 outline-none placeholder:text-slate-600"
            />
            {dragging && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-indigo-950/60 text-sm font-medium text-indigo-200 backdrop-blur-sm">
                <Upload size={18} className="mr-2" /> Drop file to load it
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3.5">
            <span className="font-mono text-xs text-slate-500">
              {code ? lines : 0} lines · {code.length.toLocaleString()} chars
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd><Kbd>Enter</Kbd> to scan
              </span>
              <Button onClick={analyzeCode} disabled={loading} size="lg">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                {loading ? "Scanning..." : "Scan code"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Sparkles size={15} className="text-indigo-300" /> Try an example
            </p>
            <div className="mt-4 space-y-2">
              {EXAMPLES.map((example) => (
                <button key={example.id} onClick={() => loadExample(example.id)} disabled={loading}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-indigo-400/40 hover:bg-indigo-500/[0.06] hover:text-white">
                  <span className="truncate">{example.label}</span>
                  <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full",
                    example.expected === "vulnerable" ? "bg-rose-400" : "bg-emerald-400")} />
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <p className="font-semibold text-slate-100">How it works</p>
            <ul className="mt-3 space-y-3 text-slate-400">
              <li className="flex gap-3"><Cpu size={16} className="mt-0.5 shrink-0 text-slate-500" />
                GraphCodeBERT classifies the whole snippet as safe or vulnerable.</li>
              <li className="flex gap-3"><Bot size={16} className="mt-0.5 shrink-0 text-slate-500" />
                Gemini explains the result and suggests fixes.</li>
            </ul>
          </Card>
        </div>
      </div>

      {loading && (
        <Card className="mt-6 flex items-center gap-4 p-5">
          <div className="relative h-10 w-10 shrink-0">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              <ScanSearch size={18} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">Analyzing your code...</p>
            <p className="text-xs text-slate-500">Running GraphCodeBERT and generating an AI explanation. This usually takes a few seconds.</p>
          </div>
        </Card>
      )}

      {error && <div className="mt-6"><Alert>{error}</Alert></div>}

      {result && (
        <div ref={resultRef} className="mt-10 scroll-mt-24 animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Result</h2>
            <Link to={`/history/${result.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200">
              Saved as scan #{result.id} <ExternalLink size={14} />
            </Link>
          </div>
          <ScanResultView scan={result} showCode={false} />
        </div>
      )}
    </>
  );
}
