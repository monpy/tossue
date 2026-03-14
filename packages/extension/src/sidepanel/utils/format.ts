import type { SelectedArea, UserAction } from "../../shared/types";

export function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatSelectedElement(area: SelectedArea | null): string {
  if (!area) {
    return "-";
  }

  const parts = [area.tagName || "element"];
  if (area.id) {
    parts.push(`#${area.id}`);
  } else if (Array.isArray(area.classes) && area.classes.length) {
    parts.push(`.${area.classes.slice(0, 2).join(".")}`);
  }
  return parts.join("");
}

export function formatActionIndex(index: number): string {
  const digits = [
    "\u24ea", "\u2460", "\u2461", "\u2462", "\u2463", "\u2464",
    "\u2465", "\u2466", "\u2467", "\u2468", "\u2469", "\u246a",
    "\u246b", "\u246c", "\u246d", "\u246e", "\u246f", "\u2470",
    "\u2471", "\u2472", "\u2473"
  ];
  return digits[index] || `${index}.`;
}

export function formatActionTitle(action: UserAction): string {
  if (action.kind === "navigation") {
    return "Page |";
  }

  if (action.type === "click" && action.href) {
    return `click link | ${action.target || ""}`.trim();
  }

  return `${action.type || "action"} | ${action.target || ""}`.trim();
}

export function formatActionDetail(action: UserAction): string {
  if (action.kind === "navigation") {
    return simplifyUrl(action.target || "");
  }
  return "";
}

export function formatActionMarkdownLine(action: UserAction, index: number): string {
  if (action.kind === "navigation") {
    return `${index + 1}. navigation | ${action.navigationKind || "url change"} | ${action.target || "-"}`;
  }
  return `${index + 1}. ${action.type} | ${action.target || "-"} | ${action.valueSnippet || "-"}`;
}

export function simplifyUrl(value: string): string {
  if (!value) {
    return "-";
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${decodeUrlPath(url.pathname)}${decodeUrlComponent(url.search)}${decodeUrlComponent(url.hash)}`.slice(0, 96);
  } catch {
    return decodeUrlComponent(String(value)).slice(0, 96);
  }
}

export function formatDisplayUrl(value: string): string {
  if (!value) {
    return "-";
  }

  try {
    const url = new URL(value);
    return `${url.origin}${decodeUrlPath(url.pathname)}${decodeUrlComponent(url.search)}${decodeUrlComponent(url.hash)}`;
  } catch {
    return decodeUrlComponent(String(value));
  }
}

function decodeUrlPath(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function decodeUrlComponent(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function sanitizeFilename(value: string): string {
  return String(value || "tossue-issue")
    .trim()
    .slice(0, 80)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "tossue-issue";
}
