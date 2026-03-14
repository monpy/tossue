/**
 * Utility for conditionally joining class names.
 * Similar to clsx/classnames but minimal.
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}
