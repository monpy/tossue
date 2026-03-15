import { ModeSelector } from "./settings/ModeSelector";
import { CustomApiSettings } from "./settings/CustomApiSettings";

export function SettingsTab() {
  return (
    <div class="settings-tab">
      <ModeSelector />
      <CustomApiSettings />
    </div>
  );
}
