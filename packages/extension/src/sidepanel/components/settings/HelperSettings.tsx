import { currentHelper } from "../../store/signals";
import { refreshHelperState, startHelperLogin } from "../../hooks/useHelper";
import { Button } from "../ui";

export function HelperSettings() {
  const helper = currentHelper.value;

  const showLoginButton =
    helper.reachable && helper.github?.gh_installed && !helper.github?.authenticated;

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

      {helper.reachable && (
        <div class="flex gap-2 mt-3">
          {showLoginButton && (
            <Button variant="secondary" size="sm" onClick={startHelperLogin}>
              Login via Helper
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={refreshHelperState}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
