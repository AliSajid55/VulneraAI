import { useState, type ReactNode } from "react";
import { Bot, Check, Copy, FileCode2, FileDown, Info, ShieldAlert, ShieldCheck } from "lucide-react";

import type { ScanDetail } from "../types";
import { formatDateTime, languageLabel, percent } from "../lib/format";
import AIFormattedText from "./AIFormattedText";
import { Alert, Button, Card, CardHeader, PredictionBadge, cx } from "./ui";

/** Full result for one scan. Used after scanning and on the detail page. */
export default function ScanResultView({
  scan,
  showCode = true,
}: {
  scan: ScanDetail;
  showCode?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const vulnerable = scan.prediction === "vulnerable";
  const ai = scan.ai_explanation;

  const [pdfLoading, setPdfLoading] = useState(false);

  // jsPDF is large, so it is only loaded when the user asks for a PDF.
  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const { downloadScanPdf } = await import("../lib/pdf");
      downloadScanPdf(scan);
    } finally {
      setPdfLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(scan.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; nothing else to do.
    }
  };

  return (
    <div className="space-y-5">
      {/* Verdict */}
      <Card className="relative overflow-hidden">
        <div className={cx(
          "pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl",
          vulnerable ? "bg-rose-600/20" : "bg-emerald-600/15"
        )} />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4 sm:flex-1">
            <div className={cx(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              vulnerable ? "bg-rose-500/15 text-danger ring-rose-500/30" : "bg-emerald-500/15 text-success ring-emerald-500/30"
            )}>
              {vulnerable ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {vulnerable ? "Potentially vulnerable" : "Classified as safe"}
                </h2>
                <span className={cx(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider",
                  vulnerable ? "bg-rose-500/15 text-danger" : "bg-emerald-500/15 text-success"
                )}>
                  {vulnerable ? "HIGH RISK" : "LOW RISK"}
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
                {vulnerable
                  ? "The model classified the scored portion of the snippet as vulnerable. Specific vulnerable lines and types were not identified."
                  : "The model classified the scored portion of the snippet as safe. This does not guarantee that the code is vulnerability-free."}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={downloadPdf} loading={pdfLoading} className="w-full shrink-0 sm:w-auto">
            <FileDown size={15} /> Download PDF
          </Button>
        </div>

        <RiskMeter probability={scan.vulnerable_probability} threshold={scan.threshold ?? 0.5} />

        <dl className="relative grid grid-cols-2 border-t border-neutral/[0.06] sm:grid-cols-4 sm:divide-x sm:divide-neutral/[0.06]">
          <Metric label="Prediction" value={<PredictionBadge prediction={scan.prediction} size="md" />} />
          <Metric label="Confidence" value={percent(scan.confidence)} />
          <Metric label="Language" value={languageLabel(scan.language)} />
          <Metric label="Submitted lines" value={String(scan.total_lines)} />
        </dl>
      </Card>

      <Alert tone="warning">Scored {scan.chunk_count} chunk(s). Long submissions may be truncated by the backend chunk limit. Confidence measures distance from the decision threshold; it is not measured accuracy.</Alert>
      {/* AI explanation */}
      <Card>
        <CardHeader
          title="AI explanation"
          subtitle="Understand the result and review possible improvements."
          icon={<Bot size={15} />}
          action={
            ai.available && ai.model ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-mono text-[11px] text-accent">
                {ai.model}
              </span>
            ) : undefined
          }
        />
        <div className="p-6">
          {ai.available && ai.explanation ? (
            <>
              <AIFormattedText text={ai.explanation} />
              <p className="mt-6 flex items-center gap-2 border-t border-neutral/[0.06] pt-4 text-xs text-slate-500">
                <Info size={13} /> AI-generated guidance may be incomplete or incorrect. Review and test suggested changes before using them.
              </p>
            </>
          ) : (
            <Alert tone="warning">
              An explanation is unavailable for this scan. The model result above is still valid.
              Check the backend logs and Gemini settings for details.
            </Alert>
          )}
        </div>
      </Card>

      {/* Code */}
      {showCode && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Submitted code"
            subtitle={`${formatDateTime(scan.created_at)} · ${languageLabel(scan.language)}`}
            icon={<FileCode2 size={15} />}
            action={
              <Button variant="ghost" size="sm" onClick={copyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            }
          />
          <div className="max-h-[440px] overflow-auto bg-ink-950/60">
            <table className="w-full border-collapse font-mono text-[13px] leading-6">
              <tbody>
                {scan.code.replace(/\n+$/, "").split("\n").map((line, i) => (
                  <tr key={i} className="hover:bg-neutral/[0.02]">
                    <td className="w-12 select-none border-r border-neutral/[0.05] pr-3 text-right align-top text-slate-600">{i + 1}</td>
                    <td className="whitespace-pre pl-4 pr-6 text-slate-200">{line || " "}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex gap-3 rounded-xl border border-neutral/[0.06] bg-neutral/[0.015] p-4 text-sm text-slate-500">
        <Info size={17} className="mt-0.5 shrink-0" />
        <p>
          This result is an overall assessment of the submitted code by GraphCodeBERT. It does not
          identify exact vulnerable lines or confirm a specific security issue.
        </p>
      </div>
    </div>
  );
}

/** Bar from 0 to 1 showing the vulnerable probability and the model's decision threshold. */
function RiskMeter({ probability, threshold }: { probability: number; threshold: number }) {
  const position = Math.min(100, Math.max(0, probability * 100));
  const thresholdPos = Math.min(100, Math.max(0, threshold * 100));
  return (
    <div className="relative px-6 pb-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">Vulnerable probability</span>
        <span className="font-mono text-slate-200">{probability.toFixed(3)}</span>
      </div>
      <div className="relative h-2 rounded-full"
        style={{ background: `linear-gradient(to right, rgba(16,185,129,0.75) 0%, rgba(251,191,36,0.75) ${thresholdPos}%, rgba(244,63,94,0.85) 100%)` }}>
        <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-neutral/60" style={{ left: `${thresholdPos}%` }}
          title={`Threshold ${threshold.toFixed(3)}`} />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink-950 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-slate-600">
        <span className="absolute left-0">0.0 safe</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap text-slate-400"
          style={{ left: `${Math.min(80, Math.max(20, thresholdPos))}%` }}>
          threshold {threshold.toFixed(3)}
        </span>
        <span className="absolute right-0">1.0 vulnerable</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-6 py-4">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}
