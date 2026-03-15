import { Card } from "./ui";
import { StatusFeedback } from "./StatusFeedback";
import { HelperStatus } from "./HelperStatus";
import { DevToolsStatus } from "./DevToolsStatus";
import { ReportForm } from "./ReportForm";
import { CaptureTools } from "./CaptureTools";
import { ActionTimeline } from "./ActionTimeline";
import { MarkdownPreview } from "./MarkdownPreview";
import { IssueCreator } from "./IssueCreator";

export function MainTab() {
  return (
    <>
      <StatusFeedback />

      <Card class="grid">
        <HelperStatus />
        <DevToolsStatus />
      </Card>

      <ReportForm />
      <CaptureTools />
      <ActionTimeline />
      <MarkdownPreview />
      <IssueCreator />
    </>
  );
}
