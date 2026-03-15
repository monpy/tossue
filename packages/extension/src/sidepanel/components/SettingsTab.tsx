import { ModeSelector } from "./settings/ModeSelector";
import { GitHubApiSettings } from "./settings/GitHubApiSettings";
import { HelperSettings } from "./settings/HelperSettings";
import { CustomApiSettings } from "./settings/CustomApiSettings";

export function SettingsTab() {
  return (
    <div class="settings-tab">
      <ModeSelector />
      <GitHubApiSettings />
      <HelperSettings />
      <CustomApiSettings />
    </div>
  );
}
