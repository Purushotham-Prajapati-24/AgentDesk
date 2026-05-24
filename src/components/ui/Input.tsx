import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, id, className = "", ...props }) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label className="signal-kicker mb-2 block text-muted" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`block min-h-11 w-full border-2 border-line bg-panel px-3 py-2 text-sm font-semibold text-line placeholder:text-muted/70 transition duration-200 ease-out focus:bg-panel-warm disabled:cursor-not-allowed disabled:bg-panel-warm disabled:opacity-70 ${
          error ? "border-danger text-danger" : ""
        } ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-muted" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-bold leading-5 text-danger" id={`${inputId}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
