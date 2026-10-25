// Renders the Gemini explanation: headings, bullets, numbered lists
// and ```fenced code blocks``` (shown in a code box).

export default function AIFormattedText({ text }: { text: string }) {
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
              className="overflow-x-auto rounded-xl border border-white/[0.08] bg-ink-950/80 p-4 font-mono text-[13px] leading-6 text-slate-200"
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
  const lines = text.replace(/\\\*/g, "*").split("\n");

  return (
    <div className="space-y-2 text-sm leading-7 text-slate-300">
      {lines.map((rawLine, index) => {
        let line = rawLine.trim();

        if (!line) return null;

        // Markdown headings
        const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);

        if (markdownHeading) {
          return (
            <h5 key={index} className="pt-2 text-base font-semibold text-indigo-200">
              {markdownHeading[1].replace(/\*\*/g, "").replace(/`/g, "")}
            </h5>
          );
        }

        // Bold headings, e.g. **Summary:** or plain "Summary:"
        const boldHeading =
          line.match(/^\*\*(.+?)\*\*:?\s*$/) ||
          line.match(/^(Summary|Potential security concerns|Suggested remediation|Limitations):$/i);

        if (boldHeading) {
          return (
            <h5 key={index} className="pt-2 font-semibold text-slate-100">
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
              <span className="shrink-0 text-indigo-300">{number ? `${number}.` : "•"}</span>
              <p className="min-w-0 flex-1">{content}</p>
            </div>
          );
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
