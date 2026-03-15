import { githubOAuthState } from "../store/signals";
import { saveGitHubOAuthState } from "../hooks/useSettings";

// OAuth Worker の URL（デプロイ後に変更）
const OAUTH_WORKER_URL = "https://tossue-oauth.workers.dev";

// 開発時は localhost を使用
const DEV_OAUTH_WORKER_URL = "http://localhost:8787";

function getWorkerUrl(): string {
  // 開発モードの判定（manifest.json の version_name などで判断可能）
  // ここでは環境変数や設定で切り替える想定
  return import.meta.env.DEV ? DEV_OAUTH_WORKER_URL : OAUTH_WORKER_URL;
}

interface OAuthConfig {
  clientId: string;
  authorizeUrl: string;
  scope: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  error?: string;
  error_description?: string;
}

/**
 * OAuth Worker から設定を取得
 */
async function getOAuthConfig(): Promise<OAuthConfig> {
  const response = await fetch(`${getWorkerUrl()}/auth/github/config`);
  if (!response.ok) {
    throw new Error("Failed to fetch OAuth config");
  }
  return response.json();
}

/**
 * GitHub OAuth フローを開始
 */
export async function startOAuthFlow(): Promise<void> {
  // OAuth 設定を取得
  const config = await getOAuthConfig();

  // リダイレクト URL を構築
  const redirectUrl = chrome.identity.getRedirectURL("oauth");
  const state = crypto.randomUUID();

  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUrl);
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("state", state);

  // OAuth フローを開始
  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      (callbackUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!callbackUrl) {
          reject(new Error("No callback URL received"));
          return;
        }
        resolve(callbackUrl);
      }
    );
  });

  // コールバック URL から code を抽出
  const callbackParams = new URL(responseUrl).searchParams;
  const code = callbackParams.get("code");
  const returnedState = callbackParams.get("state");
  const error = callbackParams.get("error");

  if (error) {
    throw new Error(callbackParams.get("error_description") || error);
  }

  if (!code) {
    throw new Error("No authorization code received");
  }

  if (returnedState !== state) {
    throw new Error("State mismatch - possible CSRF attack");
  }

  // OAuth Worker で code を token に交換
  const tokenResponse = await fetch(`${getWorkerUrl()}/auth/github/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    throw new Error(errorData.error_description || errorData.error || "Token exchange failed");
  }

  const tokenData: TokenResponse = await tokenResponse.json();

  if (tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error);
  }

  // 認証状態を保存
  githubOAuthState.value = {
    accessToken: tokenData.access_token,
    authenticatedUser: tokenData.user.login,
    avatarUrl: tokenData.user.avatar_url,
  };

  await saveGitHubOAuthState();
}
