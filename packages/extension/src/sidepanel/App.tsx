import { useTabState, refreshState } from "./hooks/useTabState";
import { useRecording } from "./hooks/useRecording";
import { useCapture } from "./hooks/useCapture";
import { useDevtoolsStatus } from "./hooks/useDevtoolsStatus";
import { Button, Card } from "./components/ui";
import { HelperStatus } from "./components/HelperStatus";
import { DevToolsStatus } from "./components/DevToolsStatus";
import { ReportForm } from "./components/ReportForm";
import { CaptureTools } from "./components/CaptureTools";
import { ActionTimeline } from "./components/ActionTimeline";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { IssueCreator } from "./components/IssueCreator";

export function App() {
  useTabState();
  useRecording();
  useCapture();
  useDevtoolsStatus();

  return (
    <main class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">AI-ready issue composer</p>
          <h1>Tossue</h1>
        </div>
        <Button id="refreshState" variant="secondary" onClick={refreshState}>
          Refresh
        </Button>
      </header>

      <Card class="grid">
        <HelperStatus />
        <DevToolsStatus />
      </Card>

      <ReportForm />
      <CaptureTools />
      <ActionTimeline />
      <MarkdownPreview />
      <IssueCreator />
    </main>
  );
}
