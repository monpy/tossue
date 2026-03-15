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
} from "../store/signals";
import { persistDraft, saveLabelPresets } from "../hooks/useTabState";
import { fetchRepositoryLabels } from "../hooks/useHelper";
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

  useEffect(() => {
    const h = helper.value;
    const isConnected = h.reachable && h.github?.authenticated;
    const currentRepo = repo.value;
    const isValid = h.repositories.some((r) => r.name_with_owner === currentRepo);

    if (isConnected && isValid) {
      fetchRepositoryLabels(currentRepo);
    } else {
      repositoryLabels.value = [];
    }
  }, [repo.value, helper.value.reachable, helper.value.github?.authenticated, helper.value.repositories]);

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

  const isHelperConnected = helper.value.reachable && helper.value.github?.authenticated;
  const isValidRepo = helper.value.repositories.some(
    (r) => r.name_with_owner === repo.value
  );
  const canShowLabels = isHelperConnected && isValidRepo;

  return (
    <div class="full label-editor">
      <span>Labels</span>

      {!isHelperConnected && (
        <p class="text-muted text-xs">Connect to Tossue Helper to use labels</p>
      )}

      {isHelperConnected && !isValidRepo && (
        <p class="text-muted text-xs">Select a repository to see available labels</p>
      )}

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
