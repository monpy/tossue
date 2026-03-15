import { useEffect } from "preact/hooks";
import {
  issueCreationSettings,
  githubOAuthState,
  oauthRepositories,
  isLoadingOAuthRepos,
} from "../store/signals";
import type {
  IssueCreationSettings,
  IssueCreateMethod,
  GitHubOAuthRepository,
} from "../../shared/types";
import {
  STORAGE_KEYS,
  DEFAULT_ISSUE_CREATION_SETTINGS,
} from "../../shared/types";
import { refreshHelperState } from "./useHelper";

/**
 * 設定の読み込み・保存を管理するフック
 */
export function useSettings() {
  useEffect(() => {
    loadSettings();
  }, []);
}

/**
 * ストレージから設定を読み込む
 */
async function loadSettings() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.ISSUE_CREATION_SETTINGS,
    STORAGE_KEYS.GITHUB_OAUTH_STATE,
  ]);

  if (stored[STORAGE_KEYS.ISSUE_CREATION_SETTINGS]) {
    issueCreationSettings.value = {
      ...DEFAULT_ISSUE_CREATION_SETTINGS,
      ...stored[STORAGE_KEYS.ISSUE_CREATION_SETTINGS],
    };
  }

  if (stored[STORAGE_KEYS.GITHUB_OAUTH_STATE]) {
    githubOAuthState.value = stored[STORAGE_KEYS.GITHUB_OAUTH_STATE];
    // OAuth 認証済みならリポジトリ一覧を取得
    if (githubOAuthState.value.accessToken) {
      fetchOAuthRepositories();
    }
  }
}

/**
 * Issue 作成モードを変更
 */
export async function setCreateMethod(method: IssueCreateMethod) {
  issueCreationSettings.value = {
    ...issueCreationSettings.value,
    createMethod: method,
  };
  await saveIssueCreationSettings();

  // モード切り替え時に接続状態を再チェック
  switch (method) {
    case "gh-cli":
      await refreshHelperState();
      break;
    case "github-api":
      if (githubOAuthState.value.accessToken) {
        await fetchOAuthRepositories();
      }
      break;
  }
}

/**
 * カスタム API 設定を更新
 */
export async function setCustomApiSettings(settings: {
  enabled: boolean;
  endpoint?: string;
}) {
  issueCreationSettings.value = {
    ...issueCreationSettings.value,
    customApi: settings,
  };
  await saveIssueCreationSettings();
}

/**
 * Issue 作成設定を部分更新
 */
export async function updateIssueCreationSettings(
  updates: Partial<IssueCreationSettings>
) {
  issueCreationSettings.value = {
    ...issueCreationSettings.value,
    ...updates,
  };
  await saveIssueCreationSettings();
}

/**
 * Issue 作成設定を保存
 */
async function saveIssueCreationSettings() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ISSUE_CREATION_SETTINGS]: issueCreationSettings.value,
  });
}

/**
 * GitHub OAuth 状態を保存
 */
export async function saveGitHubOAuthState() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.GITHUB_OAUTH_STATE]: githubOAuthState.value,
  });
}

/**
 * OAuth で選択したリポジトリを設定
 */
export async function setOAuthSelectedRepo(repo: string) {
  githubOAuthState.value = {
    ...githubOAuthState.value,
    selectedRepo: repo,
  };
  await saveGitHubOAuthState();
}

/**
 * OAuth 認証情報をクリア
 */
export async function clearGitHubOAuth() {
  githubOAuthState.value = {};
  oauthRepositories.value = [];
  await chrome.storage.local.remove(STORAGE_KEYS.GITHUB_OAUTH_STATE);
}

/**
 * OAuth 経由でリポジトリ一覧を取得
 */
export async function fetchOAuthRepositories() {
  const token = githubOAuthState.value.accessToken;
  if (!token) return;

  isLoadingOAuthRepos.value = true;

  try {
    const repos: GitHubOAuthRepository[] = [];
    let page = 1;
    const perPage = 100;

    // ページネーションで全リポジトリを取得
    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // トークンが無効なのでクリア
          await clearGitHubOAuth();
        }
        break;
      }

      const data: GitHubOAuthRepository[] = await response.json();
      repos.push(...data);

      if (data.length < perPage) break;
      page++;

      // 最大 500 件まで
      if (repos.length >= 500) break;
    }

    oauthRepositories.value = repos;
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
  } finally {
    isLoadingOAuthRepos.value = false;
  }
}
