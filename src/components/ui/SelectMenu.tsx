"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectMenuOption<T extends string = string> = {
  label: string;
  value: T;
  description?: string;
};

type SelectMenuProps<T extends string = string> = {
  value: T;
  options: Array<SelectMenuOption<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  menuPlacement?: "popover" | "inline";
};

export function SelectMenu<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  placeholder = "Select an option",
  className,
  menuPlacement = "popover",
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectOption(nextValue: T) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={cn("relative w-full", className)} ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel)_0%,var(--ui-bg)_100%)] px-3.5 py-2 text-left text-sm font-semibold text-[var(--ui-text)] outline-none transition",
          "hover:border-[#0099ff]/45 hover:bg-[var(--ui-panel-2)] focus-visible:border-[#0099ff] focus-visible:ring-4 focus-visible:ring-[#0099ff]/15",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--ui-border)]",
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className={cn("block truncate", selectedOption ? "text-[var(--ui-text)]" : "text-[var(--ui-muted)]")}>{selectedOption?.label ?? placeholder}</span>
          {selectedOption?.description ? <span className="mt-0.5 block truncate font-mono text-[11px] font-semibold text-[var(--ui-muted)]">{selectedOption.description}</span> : null}
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-muted)] transition group-hover:border-[#0099ff]/35 group-hover:text-[#0099ff]">
          <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition", open ? "rotate-180" : "")} />
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            "z-40 mt-2 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
            menuPlacement === "popover" ? "absolute inset-x-0 top-full" : "relative",
          )}
          id={listboxId}
          role="listbox"
        >
          <div className="max-h-72 overflow-auto pr-1">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  aria-selected={selected}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--ui-text)] outline-none transition",
                    selected ? "bg-[#0099ff]/12 text-[var(--ui-text)]" : "text-[var(--ui-muted)] hover:bg-[var(--ui-panel-2)] hover:text-[var(--ui-text)]",
                  )}
                  key={option.value || option.label}
                  onClick={() => selectOption(option.value)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? <span className="mt-0.5 block truncate font-mono text-[11px] font-semibold opacity-70">{option.description}</span> : null}
                  </span>
                  {selected ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0099ff]" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
