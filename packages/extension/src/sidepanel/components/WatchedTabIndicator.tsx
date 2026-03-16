import type { JSX } from "preact";
import { watchedTabInfo, isWatchingDifferentTab } from "../store/signals";
import { switchToCurrentTab } from "../hooks/useTabState";
import { Button } from "./ui";
import { cn } from "../utils/cn";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "\u2026";
}

export function WatchedTabIndicator(): JSX.Element | null {
  const info = watchedTabInfo.value;
  if (!info) return null;

  const isDifferent = isWatchingDifferentTab.value;
  const hostname = getHostname(info.url);
  const truncatedTitle = truncate(info.title || "Untitled", 30);

  return (
    <div
      class={cn(
        "flex items-center justify-between gap-2 mx-3 px-3 py-2 rounded-lg border",
        isDifferent ? "bg-yellow-50 border-yellow-200" : "bg-surface border-border"
      )}
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          {isDifferent && <span class="text-yellow-600 shrink-0">&#9888;</span>}
          <span class="text-sm font-medium text-text truncate">{truncatedTitle}</span>
        </div>
        <span class="text-xs text-muted truncate block">{hostname}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={switchToCurrentTab}
        disabled={!isDifferent}
      >
        Switch Tab
      </Button>
    </div>
  );
}
