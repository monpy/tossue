import { useComputed } from "@preact/signals";
import {
  currentState,
  currentHelper,
  selectedLabels,
  statusMessage,
  canCreateIssue,
  issueTitle,
  markdown,
  recordingState,
} from "../store/signals";
import { createIssueViaHelper } from "../hooks/useHelper";
import { sanitizeFilename } from "../utils/format";
import { blobUrlToDataUrl } from "../utils/image";
import { Button, Card } from "./ui";

export function IssueCreator() {
  const helper = useComputed(() => currentHelper.value);
  const status = useComputed(() => statusMessage.value);

  const getHintText = () => {
    const h = helper.value;
    if (!h.reachable) {
      return "Helper に接続できないため、Issue の直接作成は無効です。`Copy` を使って手動投稿してください。";
    }
    if (!h.github?.gh_installed) {
      return "helper は動作していますが `gh` が未インストールのため、Issue の直接作成はできません。";
    }
    if (!h.github?.authenticated) {
      return "helper は動作していますが、GitHub CLI のログインが必要です。`Login via Helper` の後に `Refresh Helper` してください。";
    }
    return "helper と GitHub CLI に疎通できています。直接 Issue を作成できます。";
  };

  const handleCreateIssue = async () => {
    const h = helper.value;
    const state = currentState.value;
    const draft = state.draft;
    const labels = Array.from(selectedLabels.value)
      .map((label) => String(label || "").trim())
      .filter(Boolean);

    if (!h.reachable) {
      statusMessage.value = "Tossue Helper is not reachable. Use Copy and create the issue manually.";
      return;
    }

    if (!h.github?.gh_installed) {
      statusMessage.value = "Tossue Helper is reachable, but gh is not installed on this machine.";
      return;
    }

    if (!h.github?.authenticated) {
      statusMessage.value = "GitHub CLI is not authenticated in Tossue Helper. Run gh auth login first.";
      return;
    }

    if (!draft.repo) {
      statusMessage.value = "Select or enter a repository before creating the issue.";
      return;
    }

    if (!draft.summary) {
      statusMessage.value = "Issue Title を入力してから Issue を作成してください。";
      return;
    }

    const body = markdown.value;
    const title = issueTitle.value;

    statusMessage.value = "Creating issue...";

    try {
      const result = await createIssueViaHelper(draft.repo, title, body, labels);

      const [openResult, downloadResult] = await Promise.allSettled([
        openCreatedIssue(result.issue_url),
        downloadIssueAttachments(title),
      ]);

      statusMessage.value = buildIssueCreatedMessage(
        result.issue_url,
        openResult.status === "fulfilled",
        downloadResult.status === "fulfilled" ? downloadResult.value : 0
      );
    } catch (error) {
      statusMessage.value = (error as Error).message;
    }
  };

  return (
    <Card>
      <div class="section-title-row">
        <h2 class="text-base font-bold">Create GitHub Issue</h2>
        <Button
          id="createIssue"
          disabled={!canCreateIssue.value}
          onClick={handleCreateIssue}
        >
          Create Issue
        </Button>
      </div>
      <p id="createIssueHint" class="status">
        {getHintText()}
      </p>
      <p id="submitStatus" class="status">
        {status.value}
      </p>
    </Card>
  );
}

async function openCreatedIssue(issueUrl: string): Promise<void> {
  if (!issueUrl) {
    return;
  }

  await chrome.windows.create({
    url: issueUrl,
    focused: true,
    type: "normal",
  });
}

async function downloadIssueAttachments(title: string): Promise<number> {
  const jobs: Promise<number>[] = [];
  const safeTitle = sanitizeFilename(title || "tossue-issue");
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  const state = currentState.value;
  const recording = recordingState.value;

  if (state.screenshotDataUrl) {
    jobs.push(
      chrome.downloads.download({
        url: state.screenshotDataUrl,
        filename: `Tossue/${safeTitle}-${timestamp}.png`,
        saveAs: false,
      })
    );
  }

  if (recording.objectUrl) {
    const recordingUrl = await blobUrlToDataUrl(recording.objectUrl);
    jobs.push(
      chrome.downloads.download({
        url: recordingUrl,
        filename: `Tossue/${safeTitle}-${timestamp}.webm`,
        saveAs: false,
      })
    );
  }

  await Promise.all(jobs);
  return jobs.length;
}

function buildIssueCreatedMessage(issueUrl: string, opened: boolean, attachmentCount: number): string {
  if (!attachmentCount) {
    return opened ? `Created and opened: ${issueUrl}` : `Created: ${issueUrl}`;
  }

  return `${opened ? "Created and opened" : "Created"}: ${issueUrl} | Downloaded ${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}.`;
}
