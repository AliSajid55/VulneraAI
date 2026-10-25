import { useState } from "react";
import type { ScanResult, ScanRequest } from "../types";

const API_URL = "http://127.0.0.1:5000";

const LANGUAGES = [
  "auto",
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
  "c",
  "go",
  "swift",
];

// Splits the AI text into normal text and ```fenced code blocks```,
// so code is shown in a code box instead of as raw Markdown.
function AIFormattedText({ text }: { text: string }) {
  const normalized = text.replace(/\r\n?/g, "\n");
  const parts = normalized.split(/```[^\n]*\n?/);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        // Odd indexes are inside a ``` fence.
        if (index % 2 === 1) {
          const codeText = part.replace(/\n+$/, "");
          if (!codeText.trim()) return null;

          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm leading-6 text-slate-200"
            >
              <code>{codeText}</code>
            </pre>
          );
        }

        if (!part.trim()) return null;
        return <MarkdownLines key={index} text={part} />;
      })}
    </div>
  );
}

function MarkdownLines({ text }: { text: string }) {
  const lines = text
    .replace(/\\\*/g, "*")
    .split("\n");

  return (
    <div className="space-y-2 text-sm leading-7 text-slate-300">
      {lines.map((rawLine, index) => {
        let line = rawLine.trim();

        if (!line) return null;

        // Markdown headings
        const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);

        if (markdownHeading) {
          return (
            <h5
              key={index}
              className="pt-2 text-base font-semibold text-violet-200"
            >
              {markdownHeading[1]
                .replace(/\*\*/g, "")
                .replace(/`/g, "")}
            </h5>
          );
        }

        // Bold headings, e.g. **Summary:**
        const boldHeading = line.match(/^\*\*(.+?)\*\*:?\s*$/);

        if (boldHeading) {
          return (
            <h5
              key={index}
              className="pt-2 font-semibold text-slate-100"
            >
              {boldHeading[1].replace(/:$/, "")}
            </h5>
          );
        }

        // Inline Markdown formatting
        line = line
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
          .replace(/`([^`]+)`/g, "$1");

        // Bullets and numbered lists
        const bullet = line.match(/^(\*|-|•)\s+(.+)$/);
        const numbered = line.match(/^\d+[.)]\s+(.+)$/);

        if (bullet || numbered) {
          const content = bullet ? bullet[2] : numbered![1];
          const number = numbered?.[0].match(/^\d+/)?.[0];

          return (
            <div key={index} className="flex gap-3 pl-1">
              <span className="shrink-0 text-violet-300">
                {number ? `${number}.` : "•"}
              </span>
              <p className="min-w-0 flex-1">{content}</p>
            </div>
          );
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export default function Scanner() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError("Please enter some code before scanning.");
      setScanData(null);
      return;
    }

    setLoading(true);
    setError("");
    setCopyMessage("");
    setScanData(null);

    try {
      const payload: ScanRequest = { code, language };

      const response = await fetch(`${API_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : `Scan failed with status ${response.status}.`;

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("prediction" in data) ||
        !("confidence" in data) ||
        !("overallRisk" in data) ||
        !("message" in data) ||
        !("analysis_scope" in data) ||
        !("vulnerabilities" in data)
      ) {
        throw new Error("The backend returned an unexpected response.");
      }

      const result = data as ScanResult;

      if (
        !["safe", "vulnerable"].includes(result.prediction) ||
        typeof result.confidence !== "number" ||
        !Array.isArray(result.vulnerabilities)
      ) {
        throw new Error("The backend response contains invalid scan data.");
      }

      setScanData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the scanning server."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearCode = () => {
    setCode("");
    setScanData(null);
    setError("");
    setCopyMessage("");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMessage("Code copied successfully.");
      setError("");
    } catch {
      setCopyMessage("");
      setError("Could not copy code. Please copy it manually.");
    }
  };

  const confidencePercent = scanData
    ? Math.round(scanData.confidence * 100)
    : 0;

  const ai = scanData?.ai_explanation;
  const findings = scanData?.vulnerabilities ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 text-slate-100 md:p-8">
      {/* Page heading */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Code Vulnerability Scanner
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Analyze your code for potential security risks and get
          understandable explanations and suggested improvements.
        </p>
      </header>

      {/* Code editor */}
      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 p-4">
          <h2 className="font-semibold">Code editor</h2>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            Language

            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-blue-500"
            >
              {LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {item === "auto"
                    ? "Auto detect"
                    : item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError("");
            if (copyMessage) setCopyMessage("");
          }}
          spellCheck={false}
          placeholder={`Paste code here...

Example:
def greet(name):
    return "Hello " + name`}
          className="min-h-[360px] w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600"
          aria-label="Code to scan"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 p-4">
          <span className="text-xs text-slate-400">
            {code ? code.split("\n").length : 0} lines · {code.length} characters
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCode}
              disabled={!code}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy code
            </button>

            <button
              type="button"
              onClick={clearCode}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={analyzeCode}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Scanning..." : "Scan code"}
            </button>
          </div>
        </div>
      </section>

      {copyMessage && (
        <p role="status" className="text-sm text-emerald-300">
          {copyMessage}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200"
        >
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 break-words">{error}</p>
          <p className="mt-2 text-red-300/80">
            If the server connection failed, check that the backend is running
            at {API_URL}.
          </p>
        </div>
      )}

      {/* Scan results */}
      {scanData && (
        <section className="space-y-5" aria-live="polite">
          {/* Main prediction */}
          <div
            className={`rounded-2xl border p-5 ${
              scanData.prediction === "vulnerable"
                ? "border-red-500/40 bg-red-950/30"
                : "border-emerald-500/40 bg-emerald-950/30"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-400">
                  Code analysis result
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {scanData.prediction === "vulnerable"
                    ? "Potentially Vulnerable"
                    : "Classified as Safe"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  {scanData.message}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  scanData.overallRisk === "high"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {scanData.overallRisk.toUpperCase()} RISK
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Prediction"
              value={
                scanData.prediction === "vulnerable"
                  ? "Vulnerable"
                  : "Safe"
              }
            />

            <Metric
              label="Model confidence"
              value={`${confidencePercent}%`}
            />

            <Metric
              label="Reported findings"
              value={String(
                scanData.vulnerabilitiesFound ?? findings.length
              )}
            />

            <Metric
              label="Lines analyzed"
              value={String(
                scanData.total_lines ?? code.split("\n").length
              )}
            />
          </div>

          {/* AI explanation */}
          <section className="rounded-2xl border border-violet-500/40 bg-violet-950/20 p-5">
            <div>
              <h3 className="text-lg font-semibold text-violet-200">
                AI Explanation
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Understand the result and review possible improvements.
              </p>
            </div>

            {ai?.available ? (
              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="font-semibold text-slate-100">
                    Explanation
                  </h4>

                  <div className="mt-2">
                    <AIFormattedText
                      text={
                        ai.explanation ||
                        "No explanation was returned."
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-violet-500/20 pt-4">
                  <h4 className="font-semibold text-slate-100">
                    Possible issues
                  </h4>

                  {ai.possible_issues?.length ? (
                    <ul className="mt-3 space-y-2">
                      {ai.possible_issues.map((issue, index) => (
                        <li
                          key={`${index}-${issue}`}
                          className="flex gap-3 text-sm leading-6 text-slate-300"
                        >
                          <span className="shrink-0 text-violet-300">
                            •
                          </span>
                          <span className="min-w-0 flex-1">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      No specific issues were identified in the returned
                      explanation.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <h4 className="font-semibold text-emerald-300">
                    Suggested improvements
                  </h4>

                  <div className="mt-2">
                    <AIFormattedText
                      text={
                        ai.suggested_fix ||
                        "No suggested improvements were returned."
                      }
                    />
                  </div>
                </div>

                <p className="border-t border-violet-500/20 pt-3 text-xs leading-5 text-slate-400">
                  AI-generated guidance may be incomplete or incorrect.
                  Review and test suggested changes before using them.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm leading-6 text-amber-200">
                  An explanation is unavailable for this scan. You can still
                  review the analysis result above.
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Check the backend logs and server configuration for details.
                </p>
              </div>
            )}
          </section>

          {/* Result interpretation */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="font-semibold text-slate-100">
              About this result
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              This result is an overall assessment of the submitted code. It
              does not necessarily identify exact vulnerable lines or confirm a
              specific security issue.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-400">Analysis scope:</span>

              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200">
                {scanData.analysis_scope === "whole_snippet"
                  ? "Entire code snippet"
                  : scanData.analysis_scope}
              </span>
            </div>
          </section>

          {/* Line-level findings */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">
                  Line-level findings
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Specific code locations reported by the scanner.
                </p>
              </div>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {findings.length} finding(s)
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <p className="text-sm leading-6 text-slate-300">
                  No specific line-level findings were returned for this scan.
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This does not guarantee that the code is secure. The current
                  scan may classify the complete snippet without pinpointing
                  individual vulnerable lines.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {findings.map((item, index) => (
                  <article
                    key={`${item.line}-${index}`}
                    className="rounded-xl border border-slate-700 bg-slate-800/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-slate-100">
                        {item.vulnerabilityType}
                      </h4>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.severity === "critical" ||
                          item.severity === "high"
                            ? "bg-red-500/15 text-red-300"
                            : item.severity === "medium"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {item.severity.toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Line {item.line}
                    </p>

                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm leading-6 text-slate-200">
                      <code>{item.content}</code>
                    </pre>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {item.description}
                    </p>

                    <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        Suggested action
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {item.suggestion}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-2 break-words text-xl font-bold capitalize text-slate-100">
        {value}
      </p>
    </div>
  );
}
