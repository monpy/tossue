import { needsSetup } from "../store/signals";
import { resetStateAfterCreate } from "../hooks/useTabState";
import { StatusFeedback } from "./StatusFeedback";
import { SetupPrompt } from "./SetupPrompt";
import { ReportForm } from "./ReportForm";
import { CaptureTools } from "./CaptureTools";
import { ActionTimeline } from "./ActionTimeline";
import { MarkdownPreview } from "./MarkdownPreview";
import { IssueCreator } from "./IssueCreator";
import { Button } from "./ui";

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
      <div class="flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <StatusFeedback />
        </div>
        <Button variant="ghost" size="sm" onClick={resetStateAfterCreate}>
          Clear
        </Button>
      </div>
      <ReportForm />
      <CaptureTools />
      <ActionTimeline />
      <MarkdownPreview />
      <IssueCreator />
    </>
  );
}
