import { useComputed } from "@preact/signals";
import { currentState, currentHelper, selectedLabels } from "../store/signals";
import { persistDraft } from "../hooks/useTabState";
import { Card } from "./ui";
import { LabelSelector } from "./LabelSelector";

export function ReportForm() {
  const draft = useComputed(() => currentState.value.draft);
  const repositories = useComputed(() => currentHelper.value.repositories);

  const handleInput = async (field: string, value: string) => {
    const state = currentState.value;
    currentState.value = {
      ...state,
      draft: {
        ...state.draft,
        [field]: value,
        labels: Array.from(selectedLabels.value),
      },
    };
    await persistDraft();
  };

  return (
    <>
      <Card class="grid">
        <label>
          <span>GitHub Repository</span>
          <input
            id="repo"
            list="repoOptions"
            placeholder="owner/repo"
            value={draft.value.repo}
            onInput={(e) => handleInput("repo", (e.target as HTMLInputElement).value)}
          />
          <datalist id="repoOptions">
            {repositories.value.map((repo) => (
              <option key={repo.name_with_owner} value={repo.name_with_owner} />
            ))}
          </datalist>
        </label>
      </Card>

      <Card>
        <div class="section-title-row">
          <h2>Structured Report</h2>
        </div>
        <div class="grid">
          <label class="full">
            <span>Issue Title</span>
            <textarea
              id="summary"
              rows={3}
              value={draft.value.summary}
              onInput={(e) => handleInput("summary", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Current Behavior</span>
            <textarea
              id="currentBehavior"
              rows={4}
              value={draft.value.currentBehavior}
              onInput={(e) => handleInput("currentBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Expected Behavior</span>
            <textarea
              id="expectedBehavior"
              rows={4}
              value={draft.value.expectedBehavior}
              onInput={(e) => handleInput("expectedBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <LabelSelector />
        </div>
      </Card>
    </>
  );
}
