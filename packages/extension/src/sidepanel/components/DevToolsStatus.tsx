import { useComputed } from "@preact/signals";
import { currentState } from "../store/signals";

export function DevToolsStatus() {
  const state = useComputed(() => currentState.value);

  const consoleCount = state.value.consoleEntries?.length ?? 0;
  const networkCount = state.value.networkEntries?.length ?? 0;

  const hasCaptures = consoleCount > 0 || networkCount > 0;

  const getStatusDotClass = () => {
    if (hasCaptures) return "helper-dot ok";
    return "helper-dot warn";
  };

  const getStatusText = () => {
    if (hasCaptures) return "Active";
    return "Waiting";
  };

  const getSummaryText = () => {
    if (hasCaptures) {
      return "Capturing errors and network failures";
    }
    return "Ready to capture events";
  };

  const getDetailText = () => {
    return "Console エラー (console.error/warn)、未キャッチ例外、Network エラー (4xx/5xx) は自動でキャプチャされ、Timeline に表示されます。";
  };

  return (
    <details class="full helper-details">
      <summary class="helper-summary-toggle">
        <span class="helper-summary-label">DevTools Bridge</span>
        <span class="helper-summary-state">
          <span class={getStatusDotClass()}></span>
          <span class="helper-summary-text">{getStatusText()}</span>
        </span>
      </summary>
      <div class="auth-toolbar">
        <div class="helper-status-stack">
          <div class="helper-status-line">
            <span class={getStatusDotClass()}></span>
            <p class="helper-heading">{getSummaryText()}</p>
          </div>
          <p class="status">{getDetailText()}</p>
          <div class="helper-meta">
            <span class="helper-chip">Console: {consoleCount}</span>
            <span class="helper-chip">Network: {networkCount}</span>
          </div>
        </div>
      </div>
    </details>
  );
}
