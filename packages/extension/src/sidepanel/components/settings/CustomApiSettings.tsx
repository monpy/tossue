import { useState } from "preact/hooks";
import { issueCreationSettings } from "../../store/signals";
import { setCustomApiSettings } from "../../hooks/useSettings";
import { Card, Button } from "../ui";

const SAMPLE_PAYLOAD = `{
  "title": "Issue title",
  "body": "Issue body (markdown)",
  "labels": ["bug", "help wanted"],
  "attachments": [
    {
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "dataUrl": "data:image/png;base64,..."
    }
  ],
  "timestamp": "2024-01-15T12:00:00.000Z"
}`;

export function CustomApiSettings() {
  const customApi = issueCreationSettings.value.customApi;
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

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
    setTestStatus("idle");
    setTestMessage("");
  };

  const handleSkipBuiltinChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setCustomApiSettings({
      ...customApi,
      skipBuiltinCreate: target.checked,
    });
  };

  const handleTestConnection = async () => {
    const endpoint = customApi.endpoint?.trim();
    if (!endpoint) {
      setTestStatus("error");
      setTestMessage("Endpoint URL is required");
      return;
    }

    setTestStatus("testing");
    setTestMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "[Tossue Test] Connection test",
          body: "This is a test request from Tossue to verify the endpoint is reachable.",
          labels: [],
          timestamp: new Date().toISOString(),
          _test: true,
        }),
      });

      if (response.ok) {
        setTestStatus("success");
        setTestMessage(`OK (${response.status})`);
      } else {
        setTestStatus("error");
        setTestMessage(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setTestStatus("error");
      const message = error instanceof Error ? error.message : "Connection failed";
      setTestMessage(message);
    }
  };

  return (
    <div class="grid gap-2">
      <h3 class="text-sm font-bold text-text m-0">Custom API (Optional)</h3>
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
          <div class="grid gap-3 mt-3">
            <label>
              <span>Endpoint URL</span>
              <input
                type="url"
                placeholder="https://your-api.example.com/issues"
                value={customApi.endpoint || ""}
                onInput={handleEndpointChange}
              />
            </label>

            <div class="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestConnection}
                disabled={!customApi.endpoint?.trim() || testStatus === "testing"}
              >
                {testStatus === "testing" ? "Testing..." : "Test Connection"}
              </Button>
              {testStatus === "success" && (
                <span class="text-xs text-green-600">{testMessage}</span>
              )}
              {testStatus === "error" && (
                <span class="text-xs text-red-600">{testMessage}</span>
              )}
            </div>

            <label class="inline-switch">
              <input
                type="checkbox"
                checked={customApi.skipBuiltinCreate || false}
                onChange={handleSkipBuiltinChange}
              />
              <span>Skip built-in issue creation</span>
            </label>
            <p class="text-xs text-muted">
              Enable when using Custom API to create issues directly. Built-in modes (copy/GitHub API/Helper) will be skipped.
            </p>

            <details>
              <summary class="text-xs text-muted cursor-pointer hover:text-text">
                Request format (JSON)
              </summary>
              <pre class="mt-2 p-2 bg-surface-strong rounded-lg text-xs overflow-x-auto">
                <code>{SAMPLE_PAYLOAD}</code>
              </pre>
            </details>
          </div>
        )}

        <p class="text-xs text-muted mt-2">
          Send issue data to a custom API endpoint in addition to the selected creation mode.
        </p>
      </Card>
    </div>
  );
}
