import {
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

/**
 * Server-safe presentational components used by the /docs page and its
 * client islands. No hooks, no client state — just props → JSX.
 *
 * Re-exported individually so both the server page.tsx and client
 * islands (DocsExplorer, SnippetGenerator) can import what they need.
 */

export { Check as CheckIcon, Copy as CopyIcon };

export function CapabilityRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] text-[#0099ff]">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
      </div>
    </div>
  );
}

export function DocMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <p className="studio-kicker text-[#0099ff]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--ui-text)]">{value}</p>
    </div>
  );
}

export function DocStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] font-mono text-xs font-semibold text-[#0099ff]">
        {number}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{children}</p>
      </div>
    </div>
  );
}

export function DeploymentRow({
  mode,
  bestFor,
  children,
}: {
  mode: string;
    bestFor: string;
    children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-[var(--ui-border)] pb-6 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--ui-text)]">{mode}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{bestFor}</p>
        </div>
        <span className="rounded-full border border-[#0099ff]/35 bg-[#0099ff]/10 px-3 py-1 font-mono text-xs font-semibold text-[#0099ff]">
          deploy
        </span>
      </div>
      {children}
    </section>
  );
}

export function EndpointRow({
  method,
  path,
  purpose,
  auth,
}: {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  auth: string;
}) {
  const methodClass =
    method === "GET"
      ? "border-[#0099ff]/40 bg-[#0099ff]/10 text-[#0099ff]"
      : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]";

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 md:grid-cols-[86px_minmax(0,1fr)_150px] md:items-center">
      <span className={`w-fit rounded-full border px-3 py-1 font-mono text-xs font-semibold ${methodClass}`}>
        {method}
      </span>
      <div className="min-w-0">
        <p className="break-all font-mono text-sm font-semibold text-[var(--ui-text)]">{path}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{purpose}</p>
      </div>
      <span className="w-fit rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)] md:justify-self-end">
        {auth}
      </span>
    </div>
  );
}

export function DocCallout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/10 p-4">
      <div className="flex gap-3">
        <ExternalLink aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#0099ff]" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h4>
          <div className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CopyButton({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 font-medium transition hover:bg-white/5 hover:text-[var(--ui-text)]"
      type="button"
      onClick={onCopy}
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#22c55e]" />
          <span aria-live="polite" className="text-[#22c55e]">Copied</span>
        </>
      ) : (
        <>
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export function DocCodeBlock({
  id,
  label,
  value,
  copiedId,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[#07090b]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-4 py-2 font-mono text-xs text-[var(--ui-muted)]">
        <span className="truncate">{label}</span>
        <CopyButton copied={copiedId === id} onCopy={() => onCopy(value, id)} />
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[#d6e4ef]">
        {value}
      </pre>
    </div>
  );
}

export function DocField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
      <input
        autoComplete="off"
        className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-2 font-mono text-sm text-[var(--ui-text)] transition placeholder:text-[var(--ui-muted)] focus:border-[#0099ff] focus:bg-[var(--ui-panel-2)]"
        name={label.toLowerCase().replace(/\s+/g, "-")}
        spellCheck={false}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SnippetModeButton({
  active,
  hint,
  label,
  onClick,
}: {
  active: boolean;
  hint: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-2xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-[#0099ff]/70 bg-[#0099ff]/10 text-[var(--ui-text)]"
          : "border-[var(--ui-border)] bg-[var(--ui-bg)] text-[var(--ui-muted)] hover:border-[#0099ff]/50 hover:text-[var(--ui-text)]"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs font-medium leading-5 text-[var(--ui-muted)]">{hint}</span>
    </button>
  );
}
