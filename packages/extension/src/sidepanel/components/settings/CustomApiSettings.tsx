import { issueCreationSettings } from "../../store/signals";
import { setCustomApiSettings } from "../../hooks/useSettings";
import { Card } from "../ui";

export function CustomApiSettings() {
  const customApi = issueCreationSettings.value.customApi;

  const handleToggle = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setCustomApiSettings({
      ...customApi,
      enabled: target.checked,
    });
  };

  const handleEndpointChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setCustomApiSettings({
      ...customApi,
      endpoint: target.value,
    });
  };

  return (
    <div class="settings-section">
      <h3 class="settings-section-title">Custom API (Optional)</h3>
      <Card variant="nested">
        <label class="inline-switch">
          <input
            type="checkbox"
            checked={customApi.enabled}
            onChange={handleToggle}
          />
          <span>Enable custom API</span>
        </label>

        {customApi.enabled && (
          <label style={{ marginTop: "12px" }}>
            <span>Endpoint URL</span>
            <input
              type="url"
              placeholder="https://your-api.example.com/issues"
              value={customApi.endpoint || ""}
              onChange={handleEndpointChange}
            />
          </label>
        )}

        <p class="mode-option-desc" style={{ marginTop: "8px" }}>
          Send issue data to a custom API endpoint in addition to the selected creation mode.
        </p>
      </Card>
    </div>
  );
}
