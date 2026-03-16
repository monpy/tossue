import { useEffect, useRef } from "preact/hooks";
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

  // Refs for uncontrolled inputs (to support IME properly)
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const currentBehaviorRef = useRef<HTMLTextAreaElement>(null);
  const expectedBehaviorRef = useRef<HTMLTextAreaElement>(null);

  // Track previous draft to detect reset
  const prevDraftRef = useRef({ summary: "", currentBehavior: "", expectedBehavior: "" });

  // Sync DOM with signal state on reset (when fields become empty from non-empty)
  useEffect(() => {
    const d = draft.value;
    const prev = prevDraftRef.current;
    const isReset =
      d.summary === "" &&
      d.currentBehavior === "" &&
      d.expectedBehavior === "" &&
      (prev.summary !== "" || prev.currentBehavior !== "" || prev.expectedBehavior !== "");

    if (isReset) {
      if (summaryRef.current) summaryRef.current.value = "";
      if (currentBehaviorRef.current) currentBehaviorRef.current.value = "";
      if (expectedBehaviorRef.current) expectedBehaviorRef.current.value = "";
    }

    prevDraftRef.current = {
      summary: d.summary,
      currentBehavior: d.currentBehavior,
      expectedBehavior: d.expectedBehavior,
    };
  }, [draft.value.summary, draft.value.currentBehavior, draft.value.expectedBehavior]);

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
              ref={summaryRef}
              id="summary"
              rows={3}
              defaultValue={draft.value.summary}
              onInput={(e) => handleInput("summary", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Current Behavior</span>
            <textarea
              ref={currentBehaviorRef}
              id="currentBehavior"
              rows={4}
              defaultValue={draft.value.currentBehavior}
              onInput={(e) => handleInput("currentBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="full">
            <span>Expected Behavior</span>
            <textarea
              ref={expectedBehaviorRef}
              id="expectedBehavior"
              rows={4}
              defaultValue={draft.value.expectedBehavior}
              onInput={(e) => handleInput("expectedBehavior", (e.target as HTMLTextAreaElement).value)}
            />
          </label>
          {showLabelSelector && <LabelSelector />}
        </div>
      </Card>
    </>
  );
}
