import type { ComponentChildren, JSX } from "preact";
import { cn } from "../../utils/cn";

export interface CardProps {
  variant?: "default" | "nested";
  children: ComponentChildren;
  class?: string;
}

const variantClasses = {
  default:
    "p-3.5 bg-surface/92 rounded-[14px] shadow-[0_8px_30px_rgba(62,42,18,0.06)]",
  nested: "p-3 bg-surface-strong/68 rounded-xl",
} as const;

export function Card({
  variant = "default",
  children,
  class: className,
}: CardProps): JSX.Element {
  const baseClasses = "grid gap-3 border border-border";
  const variantClass = variantClasses[variant];

  const classes = cn(baseClasses, variantClass, className);

  return <section class={classes}>{children}</section>;
}
