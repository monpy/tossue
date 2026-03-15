/**
 * Issue 作成モード設定の型定義
 */

/** Issue 作成方法 */
export type IssueCreateMethod = "copy" | "github-api" | "gh-cli";

/** Issue 作成設定 */
export interface IssueCreationSettings {
  createMethod: IssueCreateMethod;
  customApi: {
    enabled: boolean;
    endpoint?: string;
  };
}

/** GitHub OAuth 認証状態 */
export interface GitHubOAuthState {
  accessToken?: string;
  authenticatedUser?: string;
  avatarUrl?: string;
  selectedRepo?: string;
}

/** GitHub OAuth ユーザー情報 */
export interface GitHubOAuthUser {
  login: string;
  id: number;
  avatar_url: string;
}

/** GitHub リポジトリ情報（OAuth API から取得） */
export interface GitHubOAuthRepository {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
}

/** デフォルトの Issue 作成設定 */
export const DEFAULT_ISSUE_CREATION_SETTINGS: IssueCreationSettings = {
  createMethod: "copy",
  customApi: {
    enabled: false,
  },
};

/** ストレージキー */
export const STORAGE_KEYS = {
  ISSUE_CREATION_SETTINGS: "issueCreationSettings",
  GITHUB_OAUTH_STATE: "githubOAuthState",
} as const;
