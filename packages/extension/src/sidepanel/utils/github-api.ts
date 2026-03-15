import { githubOAuthState } from "../store/signals";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubIssueResponse {
  id: number;
  number: number;
  html_url: string;
  title: string;
}

interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

/**
 * GitHub API リクエストを送信
 */
async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = githubOAuthState.value.accessToken;
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response.json();
}

/**
 * リポジトリのラベル一覧を取得
 */
export async function getRepositoryLabels(repo: string): Promise<GitHubLabel[]> {
  return githubRequest<GitHubLabel[]>(`/repos/${repo}/labels?per_page=100`);
}

/**
 * ラベルが存在しない場合は作成
 */
export async function ensureLabelsExist(
  repo: string,
  labelNames: string[]
): Promise<void> {
  const existingLabels = await getRepositoryLabels(repo);
  const existingNames = new Set(existingLabels.map((l) => l.name.toLowerCase()));

  for (const name of labelNames) {
    if (!existingNames.has(name.toLowerCase())) {
      try {
        await githubRequest(`/repos/${repo}/labels`, {
          method: "POST",
          body: JSON.stringify({
            name,
            color: generateLabelColor(),
          }),
        });
      } catch (error) {
        // ラベル作成に失敗しても続行（権限がない場合など）
        console.warn(`Failed to create label "${name}":`, error);
      }
    }
  }
}

/**
 * Issue を作成
 */
export async function createIssueViaOAuth(options: {
  repo: string;
  title: string;
  body: string;
  labels: string[];
}): Promise<{ url: string; number: number }> {
  const { repo, title, body, labels } = options;

  // ラベルが存在することを確認
  if (labels.length > 0) {
    await ensureLabelsExist(repo, labels);
  }

  const response = await githubRequest<GitHubIssueResponse>(
    `/repos/${repo}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    }
  );

  return {
    url: response.html_url,
    number: response.number,
  };
}

/**
 * ランダムなラベル色を生成
 */
function generateLabelColor(): string {
  const colors = [
    "d73a4a", // red
    "0075ca", // blue
    "cfd3d7", // gray
    "a2eeef", // cyan
    "7057ff", // purple
    "008672", // green
    "e4e669", // yellow
    "d876e3", // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
