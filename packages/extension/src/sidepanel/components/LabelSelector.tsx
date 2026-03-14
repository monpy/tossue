import { useState } from "preact/hooks";
import { labelPresets, selectedLabels } from "../store/signals";
import { persistDraft, saveLabelPresets } from "../hooks/useTabState";

const DEFAULT_LABEL_PRESETS = ["bug", "needs-triage", "diagnostics", "ui", "high-priority"];

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
    <fieldset class="label-fieldset">
      <legend>Labels</legend>
      <ul class="label-preset-list" id="labelPresetList">
        {labelPresets.value.map((label) => {
          const isSelected = selectedLabels.value.has(label);
          const isCustom = !DEFAULT_LABEL_PRESETS.includes(label);
          return (
            <li key={label}>
              <button
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
            </li>
          );
        })}
      </ul>
      <div class="label-custom-row">
        <input
          type="text"
          id="customLabelInput"
          placeholder="Add custom label"
          value={customInput}
          onInput={(e) => setCustomInput((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" id="addCustomLabel" onClick={addCustomLabel}>
          Add
        </button>
      </div>
    </fieldset>
  );
}
