/**
 * Tossue OAuth Worker
 *
 * GitHub OAuth の認証コールバックを処理し、
 * authorization code を access token に交換する。
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ルーティング
    if (url.pathname === "/auth/github/callback" && request.method === "POST") {
      return handleCallback(request, env);
    }

    if (url.pathname === "/auth/github/config" && request.method === "GET") {
      return handleConfig(env);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "ok" });
    }

    return json({ error: "Not found" }, 404);
  },
};

/**
 * OAuth 設定を返す（Client ID のみ）
 */
function handleConfig(env: Env): Response {
  return json({
    clientId: env.GITHUB_CLIENT_ID,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    scope: "repo",
  });
}

/**
 * Authorization code を access token に交換
 */
async function handleCallback(request: Request, env: Env): Promise<Response> {
  let body: { code: string };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { code } = body;

  if (!code) {
    return json({ error: "Missing authorization code" }, 400);
  }

  // GitHub に token を要求
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData: GitHubTokenResponse = await tokenResponse.json();

  if (tokenData.error) {
    return json(
      {
        error: tokenData.error,
        error_description: tokenData.error_description,
      },
      400
    );
  }

  // ユーザー情報を取得
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Tossue-OAuth-Worker",
    },
  });

  if (!userResponse.ok) {
    return json({ error: "Failed to fetch user info" }, 500);
  }

  const user: GitHubUser = await userResponse.json();

  return json({
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    scope: tokenData.scope,
    user: {
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
