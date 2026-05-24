import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, id, className, ...props }) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label className="studio-kicker mb-2 block text-muted-foreground" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "block min-h-11 w-full rounded-md border border-input bg-card-elevated px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted transition duration-200 ease-out focus:border-primary focus:bg-card disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-destructive text-destructive",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-destructive" id={`${inputId}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
