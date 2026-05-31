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
      <span className="studio-kicker mb-2 block text-[#999999]">{label}</span>
      <input
        className="min-h-12 w-full rounded-md border border-[#eceae4] bg-[#fcfbf8] px-3 text-sm font-semibold text-[#1c1c1c] focus:border-[#0099ff] focus:bg-white"
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
      <span className="studio-kicker mb-2 block text-[#999999]">{label}</span>
      <textarea
        className="min-h-12 w-full resize-y rounded-md border border-[#eceae4] bg-[#fcfbf8] px-3 py-3 text-sm font-semibold leading-6 text-[#1c1c1c] focus:border-[#0099ff] focus:bg-white"
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
      <span className="studio-kicker mb-2 block text-[#999999]">{label}</span>
      <select className="min-h-12 w-full rounded-md border border-[#eceae4] bg-[#fcfbf8] px-3 text-sm font-semibold text-[#1c1c1c] focus:border-[#0099ff] focus:bg-white" value={value} onChange={(event) => onChange(event.target.value as T)}>
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
        <span className="studio-kicker mb-2 block text-[#999999]">{label}</span>
        <input className="min-h-12 w-full rounded-md border border-[#eceae4] bg-[#fcfbf8] px-3 font-mono text-sm font-semibold text-[#1c1c1c] focus:border-[#0099ff] focus:bg-white" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
      <input
        aria-label={`${label} color`}
        className="h-12 w-14 rounded-md border border-[#eceae4] bg-[#fcfbf8] p-1"
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
    <label className="flex items-center justify-between gap-4 border border-[#262626] bg-[#090909] p-3">
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-1 block text-sm font-medium leading-5 text-[#999999]">{description}</span>
      </span>
      <input className="sr-only" checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-7 w-12 shrink-0 border transition-colors",
          checked ? "border-[#0099ff] bg-[#0099ff]" : "border-[#262626] bg-black",
        )}
      >
        <span className={cn("absolute top-1 h-5 w-5 bg-white transition-transform", checked ? "translate-x-6 bg-white" : "translate-x-1")} />
      </span>
    </label>
  );
}
