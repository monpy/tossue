import { currentHelper } from "../../store/signals";

export function HelperSettings() {
  const helper = currentHelper.value;

  return (
    <div class="mode-details-content">
      <div class="helper-status-stack">
        <div class="settings-status">
          <span class={`settings-status-dot ${helper.reachable ? "ok" : ""}`} />
          <span>Connection: {helper.reachable ? "Connected" : "Not reachable"}</span>
        </div>

        {helper.reachable && (
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
                Authentication:{" "}
                {helper.github?.authenticated
                  ? `@${helper.github.login || "authenticated"}`
                  : "Not authenticated"}
              </span>
            </div>
          </>
        )}

        {!helper.reachable && (
          <p class="mode-option-desc" style={{ marginTop: "4px" }}>
            Start Tossue Helper to use this mode.
          </p>
        )}
      </div>
    </div>
  );
}
