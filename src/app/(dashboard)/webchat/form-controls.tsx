"use client";

import { cn } from "@/lib/utils";

export function WebChatTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  type?: "text" | "url";
}) {
  return (
    <label className="block">
      <span className="webchat-label">{label}</span>
      <input
        className="webchat-input"
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
      <span className="webchat-label">{label}</span>
      <textarea
        className="webchat-input resize-y py-3 leading-6"
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
      <span className="webchat-label">{label}</span>
      <select className="webchat-input" value={value} onChange={(event) => onChange(event.target.value as T)}>
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
    <label className="grid grid-cols-[1fr_56px] items-end gap-3">
      <span>
        <span className="webchat-label">{label}</span>
        <input className="webchat-input font-mono" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
      <input
        aria-label={`${label} color`}
        className="h-12 w-14 border border-[var(--webchat-line)] bg-black p-1"
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#CCFF00"}
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
    <label className="flex items-center justify-between gap-4 border border-[var(--webchat-line)] bg-black/25 p-3">
      <span>
        <span className="block text-sm font-black uppercase tracking-[0.12em] text-foreground">{label}</span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-muted-foreground">{description}</span>
      </span>
      <input className="sr-only" checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-7 w-12 shrink-0 border transition-colors",
          checked ? "border-[var(--webchat-acid)] bg-[var(--webchat-acid)]" : "border-[var(--webchat-line)] bg-black",
        )}
      >
        <span className={cn("absolute top-1 h-5 w-5 bg-foreground transition-transform", checked ? "translate-x-6 bg-black" : "translate-x-1")} />
      </span>
    </label>
  );
}
