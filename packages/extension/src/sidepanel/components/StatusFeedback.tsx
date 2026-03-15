import {
  issueCreationSettings,
  githubOAuthState,
  currentHelper,
  currentState,
  activeSidepanelTab,
  uploadScriptState,
} from "../store/signals";
import { Card } from "./ui";

type StatusLevel = "ok" | "warn" | "error";

interface StatusInfo {
  level: StatusLevel;
  mode: string;
  detail: string;
}

function getStatusInfo(): StatusInfo {
  const method = issueCreationSettings.value.createMethod;

  switch (method) {
    case "copy":
      return {
        level: "ok",
        mode: "Copy",
        detail: "Copy to clipboard",
      };

    case "github-api": {
      const oauth = githubOAuthState.value;
      if (!oauth.accessToken) {
        return {
          level: "warn",
          mode: "GitHub API",
          detail: "Not connected",
        };
      }
      return {
        level: "ok",
        mode: "GitHub API",
        detail: `@${oauth.authenticatedUser}`,
      };
    }

    case "gh-cli": {
      const helper = currentHelper.value;
      if (!helper.reachable) {
        return {
          level: "error",
          mode: "Helper",
          detail: "Not reachable",
        };
      }
      if (!helper.github?.gh_installed) {
        return {
          level: "warn",
          mode: "Helper",
          detail: "gh not installed",
        };
      }
      if (!helper.github?.authenticated) {
        return {
          level: "warn",
          mode: "Helper",
          detail: "gh not authenticated",
        };
      }
      return {
        level: "ok",
        mode: "Helper",
        detail: `@${helper.github.login}`,
      };
    }

    default:
      return {
        level: "error",
        mode: "Unknown",
        detail: "Invalid mode",
      };
  }
}

function getUploadStatusText(): string {
  const { configured, enabled } = uploadScriptState.value;
  if (!configured) {
    return "Not configured";
  }
  if (!enabled) {
    return "Disabled";
  }
  return "Enabled";
}

function getUploadStatusColor(): string {
  const { configured, enabled } = uploadScriptState.value;
  if (!configured) {
    return "text-muted";
  }
  if (!enabled) {
    return "text-amber-500";
  }
  return "text-green-600";
}

function StatusDetails() {
  const method = issueCreationSettings.value.createMethod;
  const settings = issueCreationSettings.value;
  const oauth = githubOAuthState.value;
  const helper = currentHelper.value;
  const state = currentState.value;

  const consoleCount = state.consoleEntries?.length ?? 0;
  const networkCount = state.networkEntries?.length ?? 0;
  const hasCaptures = consoleCount > 0 || networkCount > 0;

  const customApiEnabled = settings.customApi.enabled && settings.customApi.endpoint;

  const rowClass = "flex items-center gap-2 text-[11px]";

  return (
    <div class="grid gap-1 mt-2.5 pt-2.5 border-t border-border">
      {method === "copy" && (
        <div class={rowClass}>
          <span class="text-muted">Attachments:</span>
          <span>{settings.alwaysDownloadAttachments ? "Auto-download" : "Manual"}</span>
        </div>
      )}

      {method === "github-api" && oauth.accessToken && (
        <>
          <div class={rowClass}>
            <span class="text-muted">Account:</span>
            <span>@{oauth.authenticatedUser}</span>
          </div>
          {helper.reachable && (
            <div class={rowClass}>
              <span class="text-muted">Upload:</span>
              <span class={getUploadStatusColor()}>
                {getUploadStatusText()}
              </span>
            </div>
          )}
        </>
      )}

      {method === "gh-cli" && (
        <>
          <div class={rowClass}>
            <span class="text-muted">Helper:</span>
            <span class={helper.reachable ? "text-green-600" : "text-red-600"}>
              {helper.reachable ? "Connected" : "Not reachable"}
            </span>
          </div>
          {helper.reachable && (
            <>
              <div class={rowClass}>
                <span class="text-muted">gh CLI:</span>
                <span class={helper.github?.gh_installed ? "text-green-600" : "text-amber-600"}>
                  {helper.github?.gh_installed ? "Installed" : "Not installed"}
                </span>
              </div>
              <div class={rowClass}>
                <span class="text-muted">Auth:</span>
                <span class={helper.github?.authenticated ? "text-green-600" : "text-amber-600"}>
                  {helper.github?.authenticated ? `@${helper.github.login}` : "Not authenticated"}
                </span>
              </div>
              <div class={rowClass}>
                <span class="text-muted">Upload:</span>
                <span class={getUploadStatusColor()}>
                  {getUploadStatusText()}
                </span>
              </div>
            </>
          )}
        </>
      )}

      {/* DevTools status - 全モード共通 */}
      <div class={rowClass}>
        <span class="text-muted">DevTools:</span>
        <span class={hasCaptures ? "text-green-600" : "text-amber-500"}>
          {hasCaptures ? `Active (${consoleCount}c/${networkCount}n)` : "Open F12 to capture"}
        </span>
      </div>

      {customApiEnabled && (
        <div class={rowClass}>
          <span class="text-muted">Custom API:</span>
          <span class="text-blue-600 truncate max-w-48" title={settings.customApi.endpoint}>
            {settings.customApi.endpoint}
          </span>
        </div>
      )}
    </div>
  );
}

const dotColors: Record<StatusLevel, string> = {
  ok: "bg-green-600",
  warn: "bg-amber-500",
  error: "bg-red-600",
};

export function StatusFeedback() {
  const status = getStatusInfo();

  const handleChangeClick = () => {
    activeSidepanelTab.value = "settings";
  };

  return (
    <Card>
      <details class="text-xs [&>summary]:list-none [&>summary]:cursor-pointer [&>summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center gap-2">
          <span class={`w-2 h-2 rounded-full shrink-0 ${dotColors[status.level]}`} />
          <span class="flex-1 min-w-0">
            <span class="font-semibold text-text">Mode: {status.mode}</span>
            <span class="text-muted ml-1">— {status.detail}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleChangeClick();
            }}
            class="ml-auto text-xs text-blue-600 hover:text-blue-500 bg-transparent border-none cursor-pointer"
          >
            change
          </button>
        </summary>
        <StatusDetails />
      </details>
    </Card>
  );
}
