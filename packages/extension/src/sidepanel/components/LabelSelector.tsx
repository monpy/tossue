import { useState } from "preact/hooks";
import { labelPresets, selectedLabels, DEFAULT_LABEL_PRESETS } from "../store/signals";
import { persistDraft, saveLabelPresets } from "../hooks/useTabState";

export function LabelSelector() {
  const [customInput, setCustomInput] = useState("");

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
    if (DEFAULT_LABEL_PRESETS.includes(label)) {
      await toggleLabel(label);
      return;
    }

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

  return (
    <div class="full label-editor">
      <span>Labels</span>
      <div class="label-chip-list" id="labelPresetList">
        {labelPresets.value.map((label) => {
          const isSelected = selectedLabels.value.has(label);
          const isCustom = !DEFAULT_LABEL_PRESETS.includes(label);
          return (
            <button
              key={label}
              type="button"
              class={`label-chip${isSelected ? " active" : ""}${isCustom ? " custom" : ""}`}
              title={label}
              onClick={() => toggleLabel(label)}
            >
              <span>{label}</span>
              {isCustom && (
                <button
                  type="button"
                  class="label-chip-remove"
                  title={`Remove ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomLabel(label);
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
          placeholder="custom label"
          value={customInput}
          onInput={(e) => setCustomInput((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        <button class="secondary" type="button" id="addCustomLabel" onClick={addCustomLabel}>
          Add Label
        </button>
      </div>
    </div>
  );
}
