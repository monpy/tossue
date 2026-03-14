import { useComputed } from "@preact/signals";
import { currentHelper } from "../store/signals";
import { refreshHelperState, startHelperLogin } from "../hooks/useHelper";

export function HelperStatus() {
  const helper = useComputed(() => currentHelper.value);

  const getStatusDotClass = () => {
    const h = helper.value;
    if (!h.reachable) return "helper-dot warn";
    if (!h.github?.gh_installed) return "helper-dot warn";
    if (!h.github?.authenticated) return "helper-dot warn";
    return "helper-dot ok";
  };

  const getStatusText = () => {
    const h = helper.value;
    if (!h.reachable) return "Offline";
    if (!h.github?.gh_installed) return "gh Missing";
    if (!h.github?.authenticated) return "Login Required";
    return "Ready";
  };

  const getSummaryText = () => {
    const h = helper.value;
    if (!h.reachable) return "Tossue Helper is offline";
    if (!h.github?.gh_installed) return "Helper is reachable, but gh is not installed";
    if (!h.github?.authenticated) return "GitHub CLI login is required";
    return "Tossue Helper is ready";
  };

  const getDetailText = () => {
    const h = helper.value;
    if (!h.reachable) {
      return "localhost helper に接続できません。`Copy` で手動投稿してください。";
    }
    if (!h.github?.gh_installed) {
      return "Tossue Helper は応答していますが、このマシンで `gh` コマンドが見つかりません。";
    }
    if (!h.github?.authenticated) {
      return h.github?.error || "Run gh auth login.";
    }
    return `${h.repositories.length} repositories loaded and ready for issue creation.`;
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

  const showLoginButton = helper.value.reachable && helper.value.github?.gh_installed && !helper.value.github?.authenticated;

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
