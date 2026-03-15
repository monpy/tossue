import { currentHelper, statusMessage, repositoryLabels, isLoadingLabels } from "../store/signals";
import type { RepositoryLabel } from "../../shared/types";

const HELPER_BASE_URL = "http://127.0.0.1:47321";

export function useHelper() {
  return {
    refreshHelperState,
    startHelperLogin,
  };
}

export async function refreshHelperState() {
  try {
    const health = await helperGet("/health");
    const github = await helperGet("/github/status");
    let repositories: { name_with_owner: string }[] = [];

    if (github.authenticated) {
      const repoResult = await helperGet("/github/repositories");
      repositories = repoResult.repositories || [];
    }

    currentHelper.value = {
      reachable: Boolean(health.ok),
      health,
      github,
      repositories,
    };
  } catch (error) {
    currentHelper.value = {
      reachable: false,
      health: null,
      github: null,
      repositories: [],
    };
  }
}

export async function startHelperLogin() {
  statusMessage.value = "Opening gh auth login in Tossue Helper...";

  try {
    const response = await helperPost("/github/login");
    statusMessage.value = response.message;
    await refreshHelperState();
  } catch (error) {
    statusMessage.value = (error as Error).message;
  }
}

async function helperGet(path: string) {
  const response = await fetch(`${HELPER_BASE_URL}${path}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

async function helperPost(path: string) {
  const response = await fetch(`${HELPER_BASE_URL}${path}`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

export async function createIssueViaHelper(
  repo: string,
  title: string,
  body: string,
  labels: string[]
): Promise<{ issue_url: string }> {
  const response = await fetch(`${HELPER_BASE_URL}/issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ repo, title, body, labels }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Tossue Helper failed to create the issue.");
  }
  return payload;
}

export async function fetchRepositoryLabels(repo: string): Promise<RepositoryLabel[]> {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    repositoryLabels.value = [];
    return [];
  }

  const [owner, repoName] = parts;

  isLoadingLabels.value = true;
  try {
    const response = await helperGet(`/github/repos/${owner}/${repoName}/labels`);
    const labels = response.labels || [];
    repositoryLabels.value = labels;
    return labels;
  } catch {
    repositoryLabels.value = [];
    return [];
  } finally {
    isLoadingLabels.value = false;
  }
}
