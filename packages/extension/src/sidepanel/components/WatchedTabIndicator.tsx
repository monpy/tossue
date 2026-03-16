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

export function WatchedTabIndicator(): JSX.Element | null {
  const info = watchedTabInfo.value;
  if (!info) return null;

  const isDifferent = isWatchingDifferentTab.value;
  const hostname = getHostname(info.url);
  const title = info.title || "Untitled";

  return (
    <div
      class={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border overflow-hidden",
        isDifferent ? "bg-yellow-50 border-yellow-200" : "bg-surface border-border"
      )}
    >
      <div class="flex-1 min-w-0 overflow-hidden">
        <div class="flex items-center gap-1.5 min-w-0">
          {isDifferent && <span class="text-yellow-600 shrink-0">&#9888;</span>}
          <span class="text-sm font-medium text-text truncate">{title}</span>
        </div>
        <span class="text-xs text-muted truncate block">{hostname}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={switchToCurrentTab}
        disabled={!isDifferent}
        class="shrink-0"
      >
        Switch Tab
      </Button>
    </div>
  );
}
