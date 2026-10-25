import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import type { Prediction } from "../types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// --------------------------------------------------
// Layout
// --------------------------------------------------

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-white/[0.06] bg-ink-900/80 shadow-card backdrop-blur-sm",
        className
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-indigo-300/80">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// --------------------------------------------------
// Controls
// --------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
type ButtonSize = "sm" | "md" | "lg";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-6px_rgba(79,70,229,0.7)] hover:from-indigo-400 hover:to-indigo-500",
  secondary:
    "border border-white/[0.08] bg-white/[0.03] text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.06]",
  ghost: "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
  "danger-outline":
    "border border-rose-500/30 bg-rose-500/[0.06] text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15",
  danger:
    "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_6px_16px_-6px_rgba(225,29,72,0.7)] hover:from-rose-400 hover:to-rose-500",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        buttonStyles[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const controlClass =
  "h-10 w-full rounded-lg border border-white/[0.08] bg-ink-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-white/[0.14] focus:border-indigo-400/70 focus:ring-4 focus:ring-indigo-500/15";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx("relative", className)}>
      <select className={cx(controlClass, "cursor-pointer appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

/** Pill-style tab group, e.g. All / Vulnerable / Safe. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex h-10 items-center rounded-lg border border-white/[0.08] bg-ink-950/70 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition",
            value === option.value
              ? "bg-white/[0.08] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/10 bg-white/[0.06] px-1.5 font-sans text-[11px] font-medium text-slate-300">
      {children}
    </kbd>
  );
}

// --------------------------------------------------
// Feedback
// --------------------------------------------------

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "warning" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-rose-500/25 bg-rose-500/[0.07] text-rose-200",
    success: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200",
    warning: "border-amber-500/25 bg-amber-500/[0.07] text-amber-200",
    info: "border-indigo-500/25 bg-indigo-500/[0.07] text-indigo-200",
  };
  const icons = {
    error: XCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
  };
  const Icon = icons[tone];

  return (
    <div role="alert" className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles[tone])}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-ink-800 text-indigo-300">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// --------------------------------------------------
// Toasts
// --------------------------------------------------

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const colors = {
    success: "text-emerald-400",
    error: "text-rose-400",
    info: "text-indigo-400",
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.08] bg-ink-800/95 px-4 py-3 text-sm text-slate-200 shadow-2xl shadow-black/50 backdrop-blur animate-toast-in"
            >
              <Icon size={17} className={cx("mt-0.5 shrink-0", colors[toast.tone])} />
              <p className="min-w-0 flex-1">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="text-slate-500 transition hover:text-slate-300"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// --------------------------------------------------
// Data display
// --------------------------------------------------

export function PredictionBadge({
  prediction,
  size = "sm",
}: {
  prediction: Prediction;
  size?: "sm" | "md";
}) {
  const vulnerable = prediction === "vulnerable";
  const Icon = vulnerable ? ShieldAlert : ShieldCheck;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        vulnerable
          ? "bg-rose-500/10 text-rose-300 ring-rose-500/25"
          : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {vulnerable ? "Vulnerable" : "Safe"}
    </span>
  );
}

export function ConfidenceBar({
  value,
  prediction,
}: {
  value: number;
  prediction: Prediction;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cx(
            "h-full rounded-full",
            prediction === "vulnerable"
              ? "bg-gradient-to-r from-rose-500 to-rose-400"
              : "bg-gradient-to-r from-emerald-500 to-emerald-400"
          )}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono text-xs tabular-nums text-slate-300">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "indigo",
  chart,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent?: "indigo" | "rose" | "emerald" | "amber";
  chart?: ReactNode;
}) {
  const accents = {
    indigo: { icon: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/20", line: "from-indigo-500/60" },
    rose: { icon: "bg-rose-500/10 text-rose-300 ring-rose-500/20", line: "from-rose-500/60" },
    emerald: { icon: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20", line: "from-emerald-500/60" },
    amber: { icon: "bg-amber-500/10 text-amber-300 ring-amber-500/20", line: "from-amber-500/60" },
  };

  return (
    <Card className="relative overflow-hidden p-5">
      <div className={cx("absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent", accents[accent].line)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-400">{label}</p>
        <div className={cx("rounded-lg p-2 ring-1 ring-inset", accents[accent].icon)}>{icon}</div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[28px] font-semibold leading-none tabular-nums tracking-tight text-white">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </Card>
  );
}
