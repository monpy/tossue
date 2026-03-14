import { currentHelper } from "../store/signals";
import { refreshHelperState, startHelperLogin } from "../hooks/useHelper";

export function HelperStatus() {
  const helper = currentHelper.value;

  const getStatusDotClass = () => {
    if (!helper.reachable) return "helper-dot warn";
    if (!helper.github?.gh_installed) return "helper-dot warn";
    if (!helper.github?.authenticated) return "helper-dot warn";
    return "helper-dot ok";
  };

  const getStatusText = () => {
    if (!helper.reachable) return "Offline";
    if (!helper.github?.gh_installed) return "gh Missing";
    if (!helper.github?.authenticated) return "Login Required";
    return "Ready";
  };

  const getSummaryText = () => {
    if (!helper.reachable) return "Tossue Helper is offline";
    if (!helper.github?.gh_installed) return "Helper is reachable, but gh is not installed";
    if (!helper.github?.authenticated) return "GitHub CLI login is required";
    return "Tossue Helper is ready";
  };

  const getDetailText = () => {
    if (!helper.reachable) {
      return "localhost helper に接続できません。`Copy` で手動投稿してください。";
    }
    if (!helper.github?.gh_installed) {
      return "Tossue Helper は応答していますが、このマシンで `gh` コマンドが見つかりません。";
    }
    if (!helper.github?.authenticated) {
      return helper.github?.error || "Run gh auth login.";
    }
    return `${helper.repositories.length} repositories loaded and ready for issue creation.`;
  };

  const getAccountText = () => {
    if (!helper.github?.authenticated) return "Account: -";
    const name = helper.github.name
      ? `${helper.github.name} (@${helper.github.login})`
      : `@${helper.github.login}`;
    return `Account: ${name}`;
  };

  const endpointText = helper.health?.port
    ? `Endpoint: 127.0.0.1:${helper.health.port}`
    : "Endpoint: 127.0.0.1:47321";

  const showLoginButton = helper.reachable && helper.github?.gh_installed && !helper.github?.authenticated;

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
