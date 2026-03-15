import { useState } from "preact/hooks";
import { githubOAuthState } from "../../store/signals";
import { clearGitHubOAuth, fetchOAuthRepositories } from "../../hooks/useSettings";
import { startOAuthFlow } from "../../utils/github-oauth";
import { Button } from "../ui";

export function GitHubApiSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauth = githubOAuthState.value;

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

  return (
    <div class="mode-details-content">
      <div class="helper-status-stack">
        <div class="settings-status">
          <span class={`settings-status-dot ${oauth.accessToken ? "ok" : ""}`} />
          <span>
            Auth: {oauth.accessToken ? `@${oauth.authenticatedUser}` : "Not connected"}
          </span>
        </div>
      </div>

      {error && (
        <p class="text-xs text-red-600 mt-2">{error}</p>
      )}

      <div class="flex gap-2 mt-3">
        {!oauth.accessToken ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect GitHub"}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}
