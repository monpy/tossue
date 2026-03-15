import { useState } from "preact/hooks";
import {
  githubOAuthState,
  oauthRepositories,
  isLoadingOAuthRepos,
} from "../../store/signals";
import {
  clearGitHubOAuth,
  setOAuthSelectedRepo,
  fetchOAuthRepositories,
} from "../../hooks/useSettings";
import { startOAuthFlow } from "../../utils/github-oauth";

export function GitHubApiSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauth = githubOAuthState.value;
  const repos = oauthRepositories.value;
  const isLoading = isLoadingOAuthRepos.value;

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await startOAuthFlow();
      await fetchOAuthRepositories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await clearGitHubOAuth();
  };

  const handleRepoChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setOAuthSelectedRepo(target.value);
  };

  if (!oauth.accessToken) {
    return (
      <div class="mode-details-content">
        <button
          class="oauth-connect-btn"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect GitHub"}
        </button>
        {error && (
          <p class="mode-option-desc" style={{ color: "#dc2626", marginTop: "8px" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div class="mode-details-content">
      <div class="oauth-user">
        {oauth.avatarUrl && (
          <img src={oauth.avatarUrl} alt="" class="oauth-avatar" />
        )}
        <div class="oauth-user-info">
          <div class="oauth-username">@{oauth.authenticatedUser}</div>
          <div class="oauth-status-text">Connected</div>
        </div>
        <button class="oauth-disconnect-btn" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>

      <label style={{ marginTop: "12px" }}>
        <span>Repository</span>
        <select
          value={oauth.selectedRepo || ""}
          onChange={handleRepoChange}
          disabled={isLoading}
        >
          <option value="">
            {isLoading ? "Loading..." : "Select a repository"}
          </option>
          {repos.map((repo) => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
              {repo.private ? " (private)" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
