import { useState, useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import {
  labelPresets,
  selectedLabels,
  DEFAULT_LABEL_PRESETS,
  repositoryLabels,
  isLoadingLabels,
  currentState,
} from "../store/signals";
import { persistDraft, saveLabelPresets } from "../hooks/useTabState";
import { fetchRepositoryLabels } from "../hooks/useHelper";
import { Button } from "./ui";

type LabelDisplayItem = {
  name: string;
  color: string;
  isFromRepo: boolean;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "#1b1a17";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#1b1a17" : "#ffffff";
}

export function LabelSelector() {
  const [customInput, setCustomInput] = useState("");
  const repo = useComputed(() => currentState.value.draft.repo);
  const repoLabels = useComputed(() => repositoryLabels.value);
  const loading = useComputed(() => isLoadingLabels.value);
  const selected = useComputed(() => selectedLabels.value);
  const customLabels = useComputed(() => labelPresets.value);

  useEffect(() => {
    const currentRepo = repo.value;
    if (currentRepo && currentRepo.includes("/")) {
      fetchRepositoryLabels(currentRepo);
    } else {
      repositoryLabels.value = [];
    }
  }, [repo.value]);

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

  const hasRepo = repo.value && repo.value.includes("/");

  return (
    <div class="full label-editor">
      <span>Labels</span>

      {!hasRepo && (
        <p class="text-muted text-xs">Select a repository to see available labels</p>
      )}

      {hasRepo && loading.value && (
        <p class="text-muted text-xs">Loading labels...</p>
      )}

      {hasRepo && !loading.value && (
        <div class="label-chip-list" id="labelPresetList">
          {allLabels.value.map((label) => {
            const isSelected = selected.value.has(label.name);
            const bgColor = isSelected ? `#${label.color}25` : undefined;
            const borderColor = `#${label.color}`;
            const textColor = isSelected ? getContrastColor(label.color) : undefined;

            return (
              <button
                key={label.name}
                type="button"
                class={`label-chip${isSelected ? " active" : ""}${!label.isFromRepo ? " custom" : ""}`}
                title={label.name}
                onClick={() => toggleLabel(label.name)}
                style={{
                  "--label-color": `#${label.color}`,
                  "--label-bg": bgColor,
                  "--label-text": textColor,
                  borderLeftColor: borderColor,
                  borderLeftWidth: "3px",
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
      )}

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
    </div>
  );
}
