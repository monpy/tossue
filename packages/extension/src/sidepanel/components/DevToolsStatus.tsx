import { useComputed } from "@preact/signals";
import { devtoolsStatus, currentState } from "../store/signals";
import { refreshDevtoolsStatus } from "../hooks/useDevtoolsStatus";

export function DevToolsStatus() {
  const status = useComputed(() => devtoolsStatus.value);
  const state = useComputed(() => currentState.value);

  const consoleCount = state.value.consoleEntries?.length ?? 0;
  const networkCount = state.value.networkEntries?.length ?? 0;

  const getStatusDotClass = () => {
    if (!status.value.panelOpen) return "helper-dot warn";
    if (!status.value.debuggerAttached) return "helper-dot warn";
    return "helper-dot ok";
  };

  const getStatusText = () => {
    if (!status.value.panelOpen) return "Closed";
    if (!status.value.debuggerAttached) return "Listening";
    return "Attached";
  };

  const getSummaryText = () => {
    if (!status.value.panelOpen) {
      return "DevTools Panel is not open";
    }
    if (!status.value.debuggerAttached) {
      return "Listening for network errors";
    }
    return "Debugger attached - capturing all events";
  };

  const getDetailText = () => {
    if (!status.value.panelOpen) {
      return "DevTools (F12) を開き、Tossue タブで「Attach Debugger」をクリックすると、Console エラーや Network 失敗を自動キャプチャします。";
    }
    if (!status.value.debuggerAttached) {
      return "Network エラー (4xx/5xx) は自動でキャプチャされます。Console エラーもキャプチャするには「Attach Debugger」をクリックしてください。";
    }
    return "Console エラー、Runtime 例外、Network 失敗がすべてキャプチャされています。";
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
        <div class="button-row">
          <button class="secondary" onClick={refreshDevtoolsStatus}>
            Refresh Status
          </button>
        </div>
      </div>
    </details>
  );
}
