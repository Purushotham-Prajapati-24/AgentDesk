import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "lovable-shadow border-[var(--ui-text)] bg-[var(--ui-text)] text-[var(--ui-bg)] hover:bg-[var(--ui-text)]/90",
  secondary: "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] hover:bg-[var(--ui-panel-2)]",
  outline: "border-[var(--ui-border)] bg-transparent text-current hover:border-[var(--ui-blue)] hover:bg-[var(--ui-blue)]/10",
  ghost: "border-transparent bg-transparent text-current/70 hover:border-[#262626] hover:bg-white/5 hover:text-current",
  danger: "border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : leftIcon}
      {children ? <span>{children}</span> : null}
      {!loading ? rightIcon : null}
    </button>
  );
};
