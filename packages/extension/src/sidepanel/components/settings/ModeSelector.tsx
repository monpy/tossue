import { issueCreationSettings } from "../../store/signals";
import { setCreateMethod } from "../../hooks/useSettings";
import type { IssueCreateMethod } from "../../../shared/types";
import { GitHubApiSettings } from "./GitHubApiSettings";
import { HelperSettings } from "./HelperSettings";

interface ModeOption {
  id: IssueCreateMethod;
  label: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "copy",
    label: "Copy to clipboard",
    description: "Copy Markdown. Attachments saved to Downloads folder.",
  },
  {
    id: "github-api",
    label: "GitHub API (OAuth)",
    description: "Create issue via API. Attachments saved to Downloads folder.",
  },
  {
    id: "gh-cli",
    label: "Helper (gh CLI)",
    description: "Create issue via local Tossue Helper",
  },
];

export function ModeSelector() {
  const currentMethod = issueCreationSettings.value.createMethod;

  return (
    <div class="grid gap-2">
      <h3 class="text-sm font-bold text-text m-0">Issue Creation Mode</h3>
      <div class="mode-selector">
        {MODE_OPTIONS.map((option) => (
          <div key={option.id} class="mode-option-wrapper">
            <label
              class={`mode-option ${currentMethod === option.id ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="createMethod"
                value={option.id}
                checked={currentMethod === option.id}
                onChange={() => setCreateMethod(option.id)}
              />
              <div class="mode-option-content">
                <div class="mode-option-label">{option.label}</div>
                <div class="text-xs text-muted">{option.description}</div>
              </div>
            </label>

            {currentMethod === option.id && option.id === "github-api" && (
              <div class="mode-option-details">
                <GitHubApiSettings />
              </div>
            )}

            {currentMethod === option.id && option.id === "gh-cli" && (
              <div class="mode-option-details">
                <HelperSettings />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
