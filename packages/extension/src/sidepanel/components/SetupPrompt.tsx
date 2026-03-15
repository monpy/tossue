import { useState } from "preact/hooks";
import {
  setupRequirement,
  issueCreationSettings,
  activeSidepanelTab,
} from "../store/signals";
import { refreshHelperState } from "../hooks/useHelper";
import { Card, Button } from "./ui";

export function SetupPrompt() {
  const requirement = setupRequirement.value;
  const [isRetrying, setIsRetrying] = useState(false);

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

  const content = getContent(requirement.type);
  const showRetry = requirement.type.startsWith("helper-");

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
          <Button
            variant={showRetry ? "secondary" : "primary"}
            size="sm"
            onClick={goToSettings}
          >
            {content.action}
          </Button>
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
