import { useTabState, refreshState } from "./hooks/useTabState";
import { useRecording } from "./hooks/useRecording";
import { useCapture } from "./hooks/useCapture";
import { useDevtoolsStatus } from "./hooks/useDevtoolsStatus";
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
        <button id="refreshState" class="secondary" onClick={refreshState}>
          Refresh
        </button>
      </header>

      <section class="card grid">
        <HelperStatus />
        <DevToolsStatus />
      </section>

      <ReportForm />
      <CaptureTools />
      <ActionTimeline />
      <MarkdownPreview />
      <IssueCreator />
    </main>
  );
}
