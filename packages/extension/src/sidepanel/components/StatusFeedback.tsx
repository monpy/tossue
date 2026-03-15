import {
  issueCreationSettings,
  githubOAuthState,
  currentHelper,
} from "../store/signals";

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
      if (!oauth.selectedRepo) {
        return {
          level: "warn",
          mode: "GitHub API",
          detail: `@${oauth.authenticatedUser} — No repo selected`,
        };
      }
      return {
        level: "ok",
        mode: "GitHub API",
        detail: oauth.selectedRepo,
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
        detail: "Ready",
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

export function StatusFeedback() {
  const status = getStatusInfo();

  return (
    <div class="status-feedback">
      <span class={`status-feedback-dot ${status.level}`} />
      <span class="status-feedback-text">
        <span class="status-feedback-mode">Mode: {status.mode}</span>
        <span class="status-feedback-detail">— {status.detail}</span>
      </span>
    </div>
  );
}
