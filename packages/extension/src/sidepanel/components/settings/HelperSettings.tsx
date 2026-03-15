import { useSignal } from "@preact/signals";
import { currentHelper, helperAuthState } from "../../store/signals";
import { refreshHelperState, startHelperLogin, saveAuthToken, clearAuthToken } from "../../hooks/useHelper";
import { Button } from "../ui";

export function HelperSettings() {
  const helper = currentHelper.value;
  const authState = helperAuthState.value;
  const tokenInput = useSignal("");
  const authError = useSignal("");
  const isSaving = useSignal(false);

  const needsTokenAuth = helper.reachable && !authState.authenticated;
  const showLoginButton =
    helper.reachable && authState.authenticated && helper.github?.gh_installed && !helper.github?.authenticated;

  const handleConnect = async () => {
    if (!tokenInput.value.trim()) {
      authError.value = "Please enter a token";
      return;
    }
    isSaving.value = true;
    authError.value = "";
    const result = await saveAuthToken(tokenInput.value);
    isSaving.value = false;
    if (result.ok) {
      tokenInput.value = "";
      await refreshHelperState();
    } else {
      authError.value = result.error || "Failed to connect";
    }
  };

  const handleDisconnect = async () => {
    await clearAuthToken();
    await refreshHelperState();
  };

  return (
    <div class="mode-details-content">
      <div class="helper-status-stack">
        <div class="settings-status">
          <span class={`settings-status-dot ${helper.reachable ? "ok" : ""}`} />
          <span>Helper: {helper.reachable ? "Connected" : "Not reachable"}</span>
        </div>

        {helper.reachable && (
          <>
            <div class="settings-status">
              <span class={`settings-status-dot ${authState.authenticated ? "ok" : "warn"}`} />
              <span>Extension: {authState.authenticated ? "Authenticated" : "Not authenticated"}</span>
            </div>

            {authState.authenticated && (
              <>
                <div class="settings-status">
                  <span
                    class={`settings-status-dot ${helper.github?.gh_installed ? "ok" : "warn"}`}
                  />
                  <span>gh CLI: {helper.github?.gh_installed ? "Installed" : "Not installed"}</span>
                </div>

                <div class="settings-status">
                  <span
                    class={`settings-status-dot ${helper.github?.authenticated ? "ok" : "warn"}`}
                  />
                  <span>
                    Auth:{" "}
                    {helper.github?.authenticated
                      ? `@${helper.github.login || "authenticated"}`
                      : "Not authenticated"}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {!helper.reachable && (
        <div class="mt-2">
          <p class="text-xs text-muted mb-2">
            Start Tossue Helper to use this mode.
          </p>
          <Button variant="secondary" size="sm" onClick={refreshHelperState}>
            Retry Connection
          </Button>
        </div>
      )}

      {/* Token input UI when Helper is reachable but extension not authenticated */}
      {needsTokenAuth && (
        <div class="helper-auth-section mt-3">
          <p class="text-xs text-muted mb-2">
            Copy the token from Helper's tray menu (📋 Copy Token) and paste below:
          </p>
          <div class="auth-token-input-row">
            <input
              type="password"
              placeholder="Paste token here..."
              value={tokenInput.value}
              onInput={(e) => { tokenInput.value = (e.target as HTMLInputElement).value; }}
              class="auth-token-input"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnect}
              disabled={isSaving.value}
            >
              {isSaving.value ? "Verifying..." : "Connect"}
            </Button>
          </div>
          {authError.value && <p class="auth-error">{authError.value}</p>}
        </div>
      )}

      {/* Authenticated state with disconnect option */}
      {helper.reachable && authState.authenticated && (
        <div class="flex gap-2 mt-3">
          {showLoginButton && (
            <Button variant="secondary" size="sm" onClick={startHelperLogin}>
              Login via Helper
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={refreshHelperState}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
