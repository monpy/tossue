import { useComputed } from "@preact/signals";
import {
  currentState,
  currentHelper,
  selectedLabels,
  issueCreationSettings,
  githubOAuthState,
  oauthRepositories,
  isLoadingOAuthRepos,
} from "../store/signals";
import { persistDraft } from "../hooks/useTabState";
import { setOAuthSelectedRepo } from "../hooks/useSettings";
import { Card } from "./ui";
import { LabelSelector } from "./LabelSelector";

export function ReportForm() {
  const draft = useComputed(() => currentState.value.draft);
  const repositories = useComputed(() => currentHelper.value.repositories);
  const createMethod = useComputed(() => issueCreationSettings.value.createMethod);
  const oauth = useComputed(() => githubOAuthState.value);
  const oauthRepos = useComputed(() => oauthRepositories.value);
  const isLoadingRepos = useComputed(() => isLoadingOAuthRepos.value);

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

  const handleOAuthRepoInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setOAuthSelectedRepo(value);
  };

  // Copy モードではリポジトリ選択不要
  const showRepoInput = createMethod.value === "gh-cli" || createMethod.value === "github-api";

  // Label 選択は Copy モード以外で表示
  const showLabelSelector = createMethod.value !== "copy";

  // GitHub API モードかつ認証済みの場合
  const isGitHubApiMode = createMethod.value === "github-api" && !!oauth.value.accessToken;

  return (
    <>
      {showRepoInput && (
        <Card class="grid">
          <label>
            <span>GitHub Repository</span>
            {isGitHubApiMode ? (
              <>
                <input
                  id="oauthRepo"
                  list="oauthRepoOptions"
                  placeholder={isLoadingRepos.value ? "Loading..." : "owner/repo"}
                  value={oauth.value.selectedRepo || ""}
                  onInput={handleOAuthRepoInput}
                  disabled={isLoadingRepos.value}
                />
                <datalist id="oauthRepoOptions">
                  {oauthRepos.value.map((repo) => (
                    <option key={repo.id} value={repo.full_name} />
                  ))}
                </datalist>
              </>
            ) : (
              <>
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
              </>
            )}
          </label>
        </Card>
      )}

      <Card>
        <div class="section-title-row">
          <h2 class="text-base font-bold">Structured Report</h2>
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
          {showLabelSelector && <LabelSelector />}
        </div>
      </Card>
    </>
  );
}
