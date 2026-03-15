import { issueCreationSettings } from "../../store/signals";
import { updateIssueCreationSettings } from "../../hooks/useSettings";
import { Card } from "../ui";

export function AfterCreationSettings() {
  const settings = issueCreationSettings.value;

  const handleResetAfterCreateChange = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateIssueCreationSettings({ resetAfterCreate: checked });
  };

  return (
    <div class="grid gap-2">
      <h3 class="text-sm font-bold text-text m-0">After Creation</h3>
      <Card variant="nested">
        <label class="inline-switch">
          <input
            type="checkbox"
            checked={settings.resetAfterCreate}
            onChange={handleResetAfterCreateChange}
          />
          <span>Reset form after creating issue</span>
        </label>
        <p class="text-xs text-muted mt-2">
          Clear draft, screenshots, recordings, and captured logs after issue is created.
        </p>
      </Card>
    </div>
  );
}
