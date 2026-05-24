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
  primary: "border-primary bg-primary text-primary-foreground hover:bg-[#f7b23a] studio-glow",
  secondary: "border-border bg-secondary text-secondary-foreground hover:border-primary/60 hover:bg-[#242d35]",
  outline: "border-border bg-transparent text-foreground hover:border-primary/70 hover:bg-primary/10",
  ghost: "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
  danger: "border-destructive bg-destructive text-destructive-foreground hover:bg-[#ff5c68]",
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
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition duration-200 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
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
