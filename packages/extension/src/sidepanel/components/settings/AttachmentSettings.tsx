import { useRef } from "preact/hooks";
import { issueCreationSettings } from "../../store/signals";
import { updateIssueCreationSettings } from "../../hooks/useSettings";
import { Card } from "../ui";

export function AttachmentSettings() {
  const settings = issueCreationSettings.value;
  const isComposing = useRef(false);

  const handleAlwaysDownloadChange = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateIssueCreationSettings({ alwaysDownloadAttachments: checked });
  };

  const handlePathPrefixChange = (value: string) => {
    updateIssueCreationSettings({ downloadPathPrefix: value });
  };

  return (
    <div class="grid gap-2">
      <h3 class="text-sm font-bold text-text m-0">Attachments</h3>
      <Card variant="nested">
        <div class="grid gap-3">
          <label class="inline-switch">
            <input
              type="checkbox"
              checked={settings.alwaysDownloadAttachments}
              onChange={handleAlwaysDownloadChange}
            />
            <span>Always download attachments</span>
          </label>

          <label>
            <span>Download path (optional)</span>
            <input
              type="text"
              value={settings.downloadPathPrefix || ""}
              onInput={(e) => {
                if (!isComposing.current) {
                  handlePathPrefixChange((e.target as HTMLInputElement).value);
                }
              }}
              onCompositionStart={() => { isComposing.current = true; }}
              onCompositionEnd={(e) => {
                isComposing.current = false;
                handlePathPrefixChange((e.target as HTMLInputElement).value);
              }}
              placeholder="e.g. Tossue/ or projects/bugs/"
            />
            <p class="text-xs text-muted mt-1">
              Subfolder within browser's Downloads folder. Leave empty for root.
            </p>
          </label>
        </div>
      </Card>
    </div>
  );
}
