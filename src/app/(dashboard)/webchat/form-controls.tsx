"use client";

import { cn } from "@/lib/utils";

export function WebChatTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  readOnly = false,
  disabled = false,
  blocked = false,
  helperText,
  helperTone = "muted",
  onBlockedAttempt,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  disabled?: boolean;
  blocked?: boolean;
  helperText?: string;
  helperTone?: "muted" | "warning";
  onBlockedAttempt?: () => void;
  type?: "text" | "url";
}) {
  const isBlocked = blocked && !disabled;

  function reportBlockedAttempt() {
    if (isBlocked) {
      onBlockedAttempt?.();
    }
  }

  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
      <input
        aria-disabled={isBlocked || undefined}
        className={cn(
          "min-h-12 w-full rounded-xl border px-3 text-sm font-semibold outline-none transition placeholder:text-[var(--ui-muted)]",
          disabled
            ? "cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-panel)]/55 text-[var(--ui-muted)] opacity-70"
            : isBlocked
              ? "cursor-not-allowed border-[#f59e0b]/55 bg-[#f59e0b]/10 text-[#fcd34d] placeholder:text-[#fbbf24]/55 focus:border-[#f59e0b] focus:bg-[#f59e0b]/15"
            : "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]",
        )}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly || isBlocked}
        type={type}
        value={value}
        onChange={(event) => {
          if (!isBlocked) {
            onChange(event.target.value);
          }
        }}
        onFocus={reportBlockedAttempt}
        onKeyDown={(event) => {
          if (isBlocked && event.key !== "Tab") {
            event.preventDefault();
            reportBlockedAttempt();
          }
        }}
        onMouseDown={reportBlockedAttempt}
      />
      {helperText ? <span className={cn("mt-2 block text-xs font-semibold leading-5 transition-colors", helperTone === "warning" ? "text-[#f59e0b]" : "text-[var(--ui-muted)]")}>{helperText}</span> : null}
    </label>
  );
}

export function WebChatTextarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
      <textarea
        className="min-h-12 w-full resize-y rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-3 text-sm font-semibold leading-6 text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]"
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function WebChatSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
      <select className="min-h-12 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 text-sm font-semibold text-[var(--ui-text)] outline-none focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WebChatColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 grid-cols-[minmax(0,1fr)_56px] items-end gap-3">
      <span className="min-w-0">
        <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
        <input className="min-h-12 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 font-mono text-sm font-semibold text-[var(--ui-text)] outline-none focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
      <input
        aria-label={`${label} color`}
        className="h-12 w-14 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-1"
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0099FF"}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function WebChatSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3">
      <span>
        <span className="block text-sm font-semibold text-[var(--ui-text)]">{label}</span>
        <span className="mt-1 block text-sm font-medium leading-5 text-[var(--ui-muted)]">{description}</span>
      </span>
      <input className="sr-only" checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked ? "border-[var(--ui-blue)] bg-[var(--ui-blue)]" : "border-[var(--ui-border)] bg-[var(--ui-panel-2)]",
        )}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-6 bg-white" : "translate-x-1")} />
      </span>
    </label>
  );
}
