import { useComputed, useSignal } from "@preact/signals";
import { currentHelper, helperAuthState } from "../store/signals";
import { refreshHelperState, startHelperLogin, saveAuthToken, clearAuthToken } from "../hooks/useHelper";

export function HelperStatus() {
  const helper = useComputed(() => currentHelper.value);
  const authState = useComputed(() => helperAuthState.value);
  const tokenInput = useSignal("");
  const authError = useSignal("");
  const isSaving = useSignal(false);

  const needsHelperAuth = helper.value.reachable && !authState.value.authenticated;

  const getStatusDotClass = () => {
    const h = helper.value;
    if (!h.reachable) return "helper-dot warn";
    if (!authState.value.authenticated) return "helper-dot warn";
    if (!h.github?.gh_installed) return "helper-dot warn";
    if (!h.github?.authenticated) return "helper-dot warn";
    return "helper-dot ok";
  };

  const getStatusText = () => {
    const h = helper.value;
    if (!h.reachable) return "Offline";
    if (!authState.value.authenticated) return "Auth Required";
    if (!h.github?.gh_installed) return "gh Missing";
    if (!h.github?.authenticated) return "Login Required";
    return "Ready";
  };

  const getSummaryText = () => {
    const h = helper.value;
    if (!h.reachable) return "Tossue Helper is offline";
    if (!authState.value.authenticated) return "Extension authentication required";
    if (!h.github?.gh_installed) return "Helper is reachable, but gh is not installed";
    if (!h.github?.authenticated) return "GitHub CLI login is required";
    return "Tossue Helper is ready";
  };

  const getDetailText = () => {
    const h = helper.value;
    if (!h.reachable) {
      return "localhost helper に接続できません。`Copy` で手動投稿してください。";
    }
    if (!authState.value.authenticated) {
      return "Helper のトレイメニューから「📋 Copy Token」でトークンをコピーし、下に貼り付けてください。";
    }
    if (!h.github?.gh_installed) {
      return "Tossue Helper は応答していますが、このマシンで `gh` コマンドが見つかりません。";
    }
    if (!h.github?.authenticated) {
      return h.github?.error || "Run gh auth login.";
    }
    return `${h.repositories.length} repositories loaded and ready for issue creation.`;
  };

  const handleSaveToken = async () => {
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
      authError.value = result.error || "Failed to save token";
    }
  };

  const handleClearToken = async () => {
    await clearAuthToken();
    await refreshHelperState();
  };

  const getAccountText = () => {
    const h = helper.value;
    if (!h.github?.authenticated) return "Account: -";
    const name = h.github.name
      ? `${h.github.name} (@${h.github.login})`
      : `@${h.github.login}`;
    return `Account: ${name}`;
  };

  const endpointText = helper.value.health?.port
    ? `Endpoint: 127.0.0.1:${helper.value.health.port}`
    : "Endpoint: 127.0.0.1:47321";

  const showLoginButton = helper.value.reachable && authState.value.authenticated && helper.value.github?.gh_installed && !helper.value.github?.authenticated;

  return (
    <details class="full helper-details">
      <summary class="helper-summary-toggle">
        <span class="helper-summary-label">Local Helper</span>
        <span class="helper-summary-state">
          <span class={getStatusDotClass()} id="helperSummaryDot"></span>
          <span class="helper-summary-text" id="helperSummaryText">{getStatusText()}</span>
        </span>
      </summary>
      <div class="auth-toolbar">
        <div class="helper-status-stack">
          <div class="helper-status-line">
            <span class={getStatusDotClass()} id="helperDot"></span>
            <p class="helper-heading" id="helperSummary">{getSummaryText()}</p>
          </div>
          <p class="status" id="helperDetail">{getDetailText()}</p>
          <div class="helper-meta">
            <span class="helper-chip" id="helperEndpoint">{endpointText}</span>
            <span class="helper-chip" id="helperAccount">{getAccountText()}</span>
          </div>
        </div>

        {/* Token input UI */}
        {needsHelperAuth && (
          <div class="helper-auth-section">
            <div class="auth-code-form">
              <p class="auth-instruction">Paste token from Helper tray menu:</p>
              <div class="auth-token-input-row">
                <input
                  type="password"
                  placeholder="Paste token here..."
                  value={tokenInput.value}
                  onInput={(e) => { tokenInput.value = (e.target as HTMLInputElement).value; }}
                  class="auth-token-input"
                />
                <button
                  class="primary"
                  onClick={handleSaveToken}
                  disabled={isSaving.value}
                >
                  {isSaving.value ? "Verifying..." : "Connect"}
                </button>
              </div>
              {authError.value && <p class="auth-error">{authError.value}</p>}
            </div>
          </div>
        )}

        {/* Authenticated: show disconnect option */}
        {authState.value.authenticated && (
          <div class="helper-auth-connected">
            <span class="auth-connected-text">✅ Extension authenticated</span>
            <button class="secondary auth-disconnect-btn" onClick={handleClearToken}>
              Disconnect
            </button>
          </div>
        )}

        <div class="button-row">
          {showLoginButton && (
            <button class="secondary" id="loginHelper" onClick={startHelperLogin}>
              Login via Helper
            </button>
          )}
          <button class="secondary" id="refreshHelper" onClick={refreshHelperState}>
            Refresh Helper
          </button>
        </div>
      </div>
    </details>
  );
}
