import { useState, useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import {
  labelPresets,
  selectedLabels,
  DEFAULT_LABEL_PRESETS,
  repositoryLabels,
  isLoadingLabels,
  currentState,
  currentHelper,
  issueCreationSettings,
  githubOAuthState,
} from "../store/signals";
import { persistDraft, saveLabelPresets } from "../hooks/useTabState";
import { fetchRepositoryLabels } from "../hooks/useHelper";
import { getRepositoryLabels } from "../utils/github-api";
import { Button } from "./ui";

type LabelDisplayItem = {
  name: string;
  color: string;
  isFromRepo: boolean;
};

export function LabelSelector() {
  const [customInput, setCustomInput] = useState("");
  const repo = useComputed(() => currentState.value.draft.repo);
  const repoLabels = useComputed(() => repositoryLabels.value);
  const loading = useComputed(() => isLoadingLabels.value);
  const selected = useComputed(() => selectedLabels.value);
  const customLabels = useComputed(() => labelPresets.value);

  const helper = useComputed(() => currentHelper.value);
  const createMethod = useComputed(() => issueCreationSettings.value.createMethod);
  const oauth = useComputed(() => githubOAuthState.value);

  // GitHub API モード用のラベル取得
  useEffect(() => {
    const method = createMethod.value;
    const oauthState = oauth.value;

    if (method === "github-api" && oauthState.accessToken && oauthState.selectedRepo) {
      isLoadingLabels.value = true;
      getRepositoryLabels(oauthState.selectedRepo)
        .then((labels) => {
          repositoryLabels.value = labels;
        })
        .catch(() => {
          repositoryLabels.value = [];
        })
        .finally(() => {
          isLoadingLabels.value = false;
        });
    }
  }, [createMethod.value, oauth.value.accessToken, oauth.value.selectedRepo]);

  // Helper モード用のラベル取得
  useEffect(() => {
    const method = createMethod.value;
    if (method !== "gh-cli") return;

    const h = helper.value;
    const isConnected = h.reachable && h.github?.authenticated;
    const currentRepo = repo.value;
    const isValid = h.repositories.some((r) => r.name_with_owner === currentRepo);

    if (isConnected && isValid) {
      fetchRepositoryLabels(currentRepo);
    } else {
      repositoryLabels.value = [];
    }
  }, [createMethod.value, repo.value, helper.value.reachable, helper.value.github?.authenticated, helper.value.repositories]);

  const allLabels = useComputed((): LabelDisplayItem[] => {
    const items: LabelDisplayItem[] = [];
    const repoLabelNames = new Set(repoLabels.value.map((l) => l.name));

    for (const label of repoLabels.value) {
      items.push({
        name: label.name,
        color: label.color,
        isFromRepo: true,
      });
    }

    for (const label of customLabels.value) {
      if (!repoLabelNames.has(label) && !DEFAULT_LABEL_PRESETS.includes(label)) {
        items.push({
          name: label,
          color: "666666",
          isFromRepo: false,
        });
      }
    }

    return items;
  });

  const toggleLabel = async (label: string) => {
    const next = new Set(selectedLabels.value);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    selectedLabels.value = next;
    await persistDraft();
  };

  const addCustomLabel = async () => {
    const label = customInput.trim();
    if (!label) return;

    if (!labelPresets.value.includes(label)) {
      labelPresets.value = [...labelPresets.value, label];
      await saveLabelPresets();
    }

    const next = new Set(selectedLabels.value);
    next.add(label);
    selectedLabels.value = next;
    setCustomInput("");
    await persistDraft();
  };

  const removeCustomLabel = async (label: string) => {
    labelPresets.value = labelPresets.value.filter((item) => item !== label);
    const next = new Set(selectedLabels.value);
    next.delete(label);
    selectedLabels.value = next;
    await saveLabelPresets();
    await persistDraft();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomLabel();
    }
  };

  const method = createMethod.value;
  const oauthState = oauth.value;

  // GitHub API モード: OAuth 認証済み + リポジトリ選択済み
  const isGitHubApiReady =
    method === "github-api" && !!oauthState.accessToken && !!oauthState.selectedRepo;

  // Helper モード: Helper 接続済み + リポジトリ選択済み
  const isHelperConnected = helper.value.reachable && helper.value.github?.authenticated;
  const isValidRepo = helper.value.repositories.some(
    (r) => r.name_with_owner === repo.value
  );
  const isHelperReady = method === "gh-cli" && isHelperConnected && isValidRepo;

  const canShowLabels = isGitHubApiReady || isHelperReady;

  // ヒントメッセージを取得
  const getHintMessage = (): string | null => {
    if (method === "github-api") {
      if (!oauthState.accessToken) {
        return "Settings タブで GitHub に接続してください";
      }
      if (!oauthState.selectedRepo) {
        return "Settings タブでリポジトリを選択してください";
      }
      return null;
    }

    if (method === "gh-cli") {
      if (!isHelperConnected) {
        return "Helper に接続してラベルを使用";
      }
      if (!isValidRepo) {
        return "リポジトリを選択してください";
      }
      return null;
    }

    return null;
  };

  const hintMessage = getHintMessage();

  return (
    <div class="full label-editor">
      <span>Labels</span>

      {hintMessage && <p class="text-muted text-xs">{hintMessage}</p>}

      {canShowLabels && loading.value && (
        <p class="text-muted text-xs">Loading labels...</p>
      )}

      {canShowLabels && !loading.value && (
        <>
          <div class="label-chip-list" id="labelPresetList">
            {allLabels.value.map((label) => {
              const isSelected = selected.value.has(label.name);

              return (
                <button
                  key={label.name}
                  type="button"
                  class={`label-chip${isSelected ? " active" : ""}${!label.isFromRepo ? " custom" : ""}`}
                  title={label.name}
                  onClick={() => toggleLabel(label.name)}
                  style={{
                    "--label-color": `#${label.color}`,
                  }}
                >
                  {isSelected && <span class="label-check">✓</span>}
                  <span>{label.name}</span>
                  {!label.isFromRepo && (
                    <button
                      type="button"
                      class="label-chip-remove"
                      title={`Remove ${label.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomLabel(label.name);
                      }}
                    >
                      ×
                    </button>
                  )}
                </button>
              );
            })}
          </div>

          <div class="label-add-row">
            <input
              id="customLabelInput"
              placeholder="Add custom label..."
              value={customInput}
              onInput={(e) => setCustomInput((e.target as HTMLInputElement).value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={!customInput.trim()}
              onClick={addCustomLabel}
            >
              Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
