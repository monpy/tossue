import { ModeSelector } from "./settings/ModeSelector";
import { AttachmentSettings } from "./settings/AttachmentSettings";
import { AfterCreationSettings } from "./settings/AfterCreationSettings";
import { CustomApiSettings } from "./settings/CustomApiSettings";

export function SettingsTab() {
  return (
    <div class="grid gap-5">
      <ModeSelector />
      <AttachmentSettings />
      <AfterCreationSettings />
      <CustomApiSettings />
    </div>
  );
}
