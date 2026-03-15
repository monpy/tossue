import { needsSetup } from "../store/signals";
import { StatusFeedback } from "./StatusFeedback";
import { SetupPrompt } from "./SetupPrompt";
import { ReportForm } from "./ReportForm";
import { CaptureTools } from "./CaptureTools";
import { ActionTimeline } from "./ActionTimeline";
import { MarkdownPreview } from "./MarkdownPreview";
import { IssueCreator } from "./IssueCreator";

export function MainTab() {
  const showSetup = needsSetup.value;

  if (showSetup) {
    return (
      <>
        <StatusFeedback />
        <SetupPrompt />
      </>
    );
  }

  return (
    <>
      <StatusFeedback />
      <ReportForm />
      <CaptureTools />
      <ActionTimeline />
      <MarkdownPreview />
      <IssueCreator />
    </>
  );
}
