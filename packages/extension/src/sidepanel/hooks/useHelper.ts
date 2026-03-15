import { currentHelper, statusMessage, repositoryLabels, isLoadingLabels, helperAuthState } from "../store/signals";
import type { RepositoryLabel } from "../../shared/types";

const HELPER_BASE_URL = "http://127.0.0.1:47321";
const AUTH_TOKEN_KEY = "tossue_helper_auth_token";

export function useHelper() {
  return {
    refreshHelperState,
    startHelperLogin,
    loadAuthToken,
    saveAuthToken,
    verifyToken,
    clearAuthToken,
  };
}

export async function refreshHelperState() {
  try {
    // /health is public (no auth required)
    const health = await helperGet("/health", false);

    // Check if we're authenticated with helper
    if (!helperAuthState.value.authenticated) {
      currentHelper.value = {
        reachable: Boolean(health.ok),
        health,
        github: null,
        repositories: [],
      };
      return;
    }

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

function getAuthHeaders(): HeadersInit {
  const token = helperAuthState.value.token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function helperGet(path: string, requireAuth = true) {
  const headers: HeadersInit = requireAuth ? getAuthHeaders() : {};
  const response = await fetch(`${HELPER_BASE_URL}${path}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      helperAuthState.value = { ...helperAuthState.value, authenticated: false };
    }
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

async function helperPost(path: string, body?: unknown, requireAuth = true) {
  const headers: HeadersInit = {
    ...(requireAuth ? getAuthHeaders() : {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  const response = await fetch(`${HELPER_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      helperAuthState.value = { ...helperAuthState.value, authenticated: false };
    }
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

// Load auth token from chrome.storage on startup
export async function loadAuthToken(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(AUTH_TOKEN_KEY);
    const token = result[AUTH_TOKEN_KEY];
    if (token) {
      // Verify the token is still valid
      const isValid = await verifyToken(token);
      if (isValid) {
        helperAuthState.value = {
          authenticated: true,
          token,
        };
        return;
      }
    }
    helperAuthState.value = { authenticated: false, token: null };
  } catch {
    helperAuthState.value = { authenticated: false, token: null };
  }
}

// Save token and verify it
export async function saveAuthToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { ok: false, error: "Token cannot be empty" };
  }

  const isValid = await verifyToken(trimmedToken);
  if (!isValid) {
    return { ok: false, error: "Invalid token. Make sure you copied the correct token from Helper." };
  }

  await chrome.storage.local.set({ [AUTH_TOKEN_KEY]: trimmedToken });
  helperAuthState.value = {
    authenticated: true,
    token: trimmedToken,
  };
  return { ok: true };
}

// Verify token against Helper
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // Try to access a protected endpoint with the token
    const response = await fetch(`${HELPER_BASE_URL}/github/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Clear auth token
export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove(AUTH_TOKEN_KEY);
  helperAuthState.value = { authenticated: false, token: null };
}

export async function createIssueViaHelper(
  repo: string,
  title: string,
  body: string,
  labels: string[]
): Promise<{ issue_url: string }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
  const response = await fetch(`${HELPER_BASE_URL}/issues`, {
    method: "POST",
    headers,
    body: JSON.stringify({ repo, title, body, labels }),
  });

  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      helperAuthState.value = { ...helperAuthState.value, authenticated: false };
    }
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

export async function uploadFileViaHelper(
  filename: string,
  mimeType: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const response = await helperPost("/upload/file", {
      filename,
      mime_type: mimeType,
      data: dataUrl,
    });
    return response.url || null;
  } catch {
    return null;
  }
}

export async function checkUploadScriptConfigured(): Promise<boolean> {
  try {
    const response = await helperGet("/upload/script");
    return response.configured === true;
  } catch {
    return false;
  }
}
