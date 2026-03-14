import { currentState, currentHelper, selectedLabels } from "../store/signals";
import { persistDraft } from "../hooks/useTabState";
import { LabelSelector } from "./LabelSelector";

export function ReportForm() {
  const state = currentState.value;
  const draft = state.draft;
  const helper = currentHelper.value;

  const handleInput = async (field: keyof typeof draft, value: string) => {
    currentState.value = {
      ...state,
      draft: {
        ...draft,
        [field]: value,
        labels: Array.from(selectedLabels.value),
      },
    };
    await persistDraft();
  };

  return (
    <>
      <section class="card grid">
        <label>
          <span>GitHub Repository</span>
          <input
            id="repo"
            list="repoOptions"
            placeholder="owner/repo"
            value={draft.repo}
            onInput={(e) => handleInput("repo", (e.target as HTMLInputElement).value)}
          />
          <datalist id="repoOptions">
            {helper.repositories.map((repo) => (
              <option key={repo.name_with_owner} value={repo.name_with_owner} />
            ))}
          </datalist>
        </label>
      </section>

      <section class="card">
        <div class="section-title-row">
          <h2>Structured Report</h2>
        </div>
        <div class="grid">
          <label class="full">
            <span>Issue Title</span>
            <textarea
              id="summary"
              rows={3}
              value={draft.summary}
              onInput={(e) => handleInput("summary", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Current Behavior</span>
            <textarea
              id="currentBehavior"
              rows={4}
              value={draft.currentBehavior}
              onInput={(e) => handleInput("currentBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Expected Behavior</span>
            <textarea
              id="expectedBehavior"
              rows={4}
              value={draft.expectedBehavior}
              onInput={(e) => handleInput("expectedBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <LabelSelector />
        </div>
      </section>
    </>
  );
}
