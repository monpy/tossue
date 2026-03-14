import type { ComponentChildren, JSX } from "preact";
import { cn } from "../../utils/cn";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  iconOnly?: boolean;
  disabled?: boolean;
  children: ComponentChildren;
  onClick?: () => void;
  type?: "button" | "submit";
  id?: string;
  class?: string;
  "aria-label"?: string;
}

const variantClasses = {
  primary: "bg-accent text-white",
  secondary: "bg-accent-soft text-text",
  ghost: "bg-transparent text-text hover:bg-black/8",
} as const;

const sizeClasses = {
  md: "px-3.5 py-2.5",
  sm: "px-2.5 py-1.5 text-xs",
} as const;

const iconSizeClasses = {
  md: "w-7 h-7 p-0 text-[15px]",
  sm: "w-5.5 h-5.5 p-0 text-[13px]",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  disabled = false,
  children,
  onClick,
  type = "button",
  id,
  class: className,
  "aria-label": ariaLabel,
}: ButtonProps): JSX.Element {
  const baseClasses =
    "border-0 rounded-full cursor-pointer font-bold leading-none disabled:opacity-50 disabled:cursor-default";
  const variantClass = variantClasses[variant];
  const sizeClass = iconOnly ? iconSizeClasses[size] : sizeClasses[size];

  const classes = cn(baseClasses, variantClass, sizeClass, className);

  return (
    <button
      type={type}
      id={id}
      class={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
