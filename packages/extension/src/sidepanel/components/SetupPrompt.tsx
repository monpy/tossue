import { useState } from "preact/hooks";
import {
  setupRequirement,
  issueCreationSettings,
  activeSidepanelTab,
} from "../store/signals";
import { refreshHelperState, saveAuthToken } from "../hooks/useHelper";
import { Card, Button } from "./ui";

export function SetupPrompt() {
  const requirement = setupRequirement.value;
  const [isRetrying, setIsRetrying] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  if (!requirement) {
    return null;
  }

  const goToSettings = () => {
    activeSidepanelTab.value = "settings";
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshHelperState();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setAuthError("Please enter a token");
      return;
    }
    setIsConnecting(true);
    setAuthError("");
    const result = await saveAuthToken(tokenInput);
    setIsConnecting(false);
    if (result.ok) {
      setTokenInput("");
      await refreshHelperState();
    } else {
      setAuthError(result.error || "Failed to connect");
    }
  };

  const content = getContent(requirement.type);
  const showRetry = requirement.type === "helper-not-reachable";
  const showTokenInput = requirement.type === "helper-not-authenticated";

  return (
    <Card>
      <div class="grid gap-3">
        <div class="flex items-start gap-3">
          <span class="text-xl">{content.icon}</span>
          <div class="grid gap-1">
            <h3 class="text-sm font-bold text-text m-0">{content.title}</h3>
            <p class="text-xs text-muted m-0">{content.description}</p>
          </div>
        </div>

        {/* Token input for helper-not-authenticated */}
        {showTokenInput && (
          <div class="grid gap-2">
            <div class="auth-token-input-row">
              <input
                type="password"
                placeholder="Paste token here..."
                value={tokenInput}
                onInput={(e) => setTokenInput((e.target as HTMLInputElement).value)}
                class="auth-token-input"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? "Verifying..." : "Connect"}
              </Button>
            </div>
            {authError && <p class="auth-error">{authError}</p>}
          </div>
        )}

        <div class="flex gap-2 flex-wrap">
          {showRetry && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? "Checking..." : "Retry Connection"}
            </Button>
          )}
          {!showTokenInput && (
            <Button
              variant={showRetry ? "secondary" : "primary"}
              size="sm"
              onClick={goToSettings}
            >
              {content.action}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              issueCreationSettings.value = {
                ...issueCreationSettings.value,
                createMethod: "copy",
              };
            }}
          >
            Use Copy Mode
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface SetupContent {
  icon: string;
  title: string;
  description: string;
  action: string;
}

function getContent(type: string): SetupContent {
  switch (type) {
    case "github-api-not-connected":
      return {
        icon: "🔗",
        title: "Connect to GitHub",
        description:
          "Sign in with GitHub to create issues directly via the API.",
        action: "Connect GitHub",
      };
    case "helper-not-reachable":
      return {
        icon: "🖥️",
        title: "Start Tossue Helper",
        description:
          "The Tossue Helper app is not running. Start it to create issues via gh CLI.",
        action: "Setup Helper",
      };
    case "helper-not-authenticated":
      return {
        icon: "🔑",
        title: "Connect to Helper",
        description:
          "Copy the token from Helper's tray menu (📋 Copy Token) and paste below.",
        action: "Go to Settings",
      };
    case "helper-gh-not-installed":
      return {
        icon: "⚙️",
        title: "Install GitHub CLI",
        description:
          "The gh CLI is not installed. Install it to create issues via Helper.",
        action: "View Instructions",
      };
    case "helper-gh-not-authenticated":
      return {
        icon: "🔐",
        title: "Authenticate gh CLI",
        description:
          "Run 'gh auth login' in your terminal to authenticate with GitHub.",
        action: "View Instructions",
      };
    default:
      return {
        icon: "⚠️",
        title: "Setup Required",
        description: "Complete the setup to create issues.",
        action: "Go to Settings",
      };
  }
}
