import { useComputed } from "@preact/signals";
import {
  currentState,
  currentHelper,
  selectedLabels,
  statusMessage,
  canCreateIssueWithCurrentMode,
  issueTitle,
  markdown,
  recordingState,
  issueCreationSettings,
  githubOAuthState,
} from "../store/signals";
import { createIssueViaHelper } from "../hooks/useHelper";
import { resetStateAfterCreate } from "../hooks/useTabState";
import { createIssueViaOAuth } from "../utils/github-api";
import { sanitizeFilename } from "../utils/format";
import { blobUrlToDataUrl } from "../utils/image";
import { Button, Card } from "./ui";

export function IssueCreator() {
  const status = useComputed(() => statusMessage.value);
  const createMethod = useComputed(() => issueCreationSettings.value.createMethod);

  const getHintText = () => {
    const method = createMethod.value;
    const settings = issueCreationSettings.value;

    switch (method) {
      case "copy": {
        const base = "Markdown をクリップボードにコピーして手動で Issue を作成します。";
        if (settings.alwaysDownloadAttachments) {
          return `${base} Attachments もダウンロードされます。`;
        }
        return base;
      }

      case "github-api": {
        const oauth = githubOAuthState.value;
        if (!oauth.accessToken) {
          return "Settings タブで GitHub に接続してください。";
        }
        if (!oauth.selectedRepo) {
          return "Settings タブでリポジトリを選択してください。";
        }
        return `GitHub API 経由で ${oauth.selectedRepo} に Issue を作成します。`;
      }

      case "gh-cli": {
        const h = currentHelper.value;
        if (!h.reachable) {
          return "Helper に接続できません。Helper を起動するか、別のモードを選択してください。";
        }
        if (!h.github?.gh_installed) {
          return "Helper は動作していますが gh が未インストールです。";
        }
        if (!h.github?.authenticated) {
          return "Helper は動作していますが、gh auth login が必要です。";
        }
        return "Helper 経由で gh コマンドで Issue を作成します。";
      }

      default:
        return "";
    }
  };

  const getButtonLabel = () => {
    switch (createMethod.value) {
      case "copy":
        return "Copy Issue";
      case "github-api":
      case "gh-cli":
        return "Create Issue";
      default:
        return "Create Issue";
    }
  };

  const handleCreateIssue = async () => {
    const method = createMethod.value;
    const settings = issueCreationSettings.value;
    const state = currentState.value;
    const draft = state.draft;
    const labels = Array.from(selectedLabels.value)
      .map((label) => String(label || "").trim())
      .filter(Boolean);

    const body = markdown.value;
    const title = issueTitle.value;

    if (!draft.summary) {
      statusMessage.value = "Issue Title を入力してください。";
      return;
    }

    const skipBuiltin = settings.customApi.enabled && settings.customApi.skipBuiltinCreate;

    // Built-in mode (unless skipped for Custom API only mode)
    if (!skipBuiltin) {
      switch (method) {
        case "copy":
          await handleCopyMode(title, body);
          break;

        case "github-api":
          await handleGitHubApiMode(title, body, labels);
          break;

        case "gh-cli":
          await handleHelperMode(draft.repo, title, body, labels);
          break;
      }
    }

    // カスタム API 送信
    await sendToCustomApi(title, body, labels);

    // Custom API only mode の場合はステータスメッセージを設定
    if (skipBuiltin) {
      statusMessage.value = "Sent to Custom API";
    }

    // リセット処理
    if (settings.resetAfterCreate) {
      await resetStateAfterCreate();
      statusMessage.value = `${statusMessage.value} (Form reset)`;
    }
  };

  return (
    <Card>
      <div class="section-title-row">
        <h2 class="text-base font-bold">Create GitHub Issue</h2>
        <Button
          id="createIssue"
          disabled={!canCreateIssueWithCurrentMode.value && createMethod.value !== "copy"}
          onClick={handleCreateIssue}
        >
          {getButtonLabel()}
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

async function handleCopyMode(title: string, body: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(body);

    const settings = issueCreationSettings.value;
    if (settings.alwaysDownloadAttachments) {
      const count = await downloadIssueAttachments(title);
      if (count > 0) {
        statusMessage.value = `Copied to clipboard! Downloaded ${count} attachment${count > 1 ? "s" : ""}.`;
      } else {
        statusMessage.value = "Copied to clipboard!";
      }
    } else {
      statusMessage.value = "Copied to clipboard!";
    }
  } catch (error) {
    statusMessage.value = "Failed to copy to clipboard.";
  }
}

async function handleGitHubApiMode(
  title: string,
  body: string,
  labels: string[]
): Promise<void> {
  const oauth = githubOAuthState.value;

  if (!oauth.accessToken) {
    statusMessage.value = "GitHub に接続されていません。Settings タブで接続してください。";
    return;
  }

  if (!oauth.selectedRepo) {
    statusMessage.value = "リポジトリが選択されていません。Settings タブで選択してください。";
    return;
  }

  statusMessage.value = "Creating issue via GitHub API...";

  try {
    const result = await createIssueViaOAuth({
      repo: oauth.selectedRepo,
      title,
      body,
      labels,
    });

    const [openResult, downloadResult] = await Promise.allSettled([
      openCreatedIssue(result.url),
      downloadIssueAttachments(title),
    ]);

    statusMessage.value = buildIssueCreatedMessage(
      result.url,
      openResult.status === "fulfilled",
      downloadResult.status === "fulfilled" ? downloadResult.value : 0
    );
  } catch (error) {
    statusMessage.value = `Failed to create issue: ${(error as Error).message}`;
  }
}

async function handleHelperMode(
  repo: string,
  title: string,
  body: string,
  labels: string[]
): Promise<void> {
  const h = currentHelper.value;

  if (!h.reachable) {
    statusMessage.value = "Tossue Helper is not reachable.";
    return;
  }

  if (!h.github?.gh_installed) {
    statusMessage.value = "gh is not installed.";
    return;
  }

  if (!h.github?.authenticated) {
    statusMessage.value = "gh is not authenticated.";
    return;
  }

  if (!repo) {
    statusMessage.value = "Select or enter a repository.";
    return;
  }

  statusMessage.value = "Creating issue via Helper...";

  try {
    const result = await createIssueViaHelper(repo, title, body, labels);

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
}

interface AttachmentPayload {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

async function sendToCustomApi(
  title: string,
  body: string,
  labels: string[]
): Promise<void> {
  const settings = issueCreationSettings.value;

  if (!settings.customApi.enabled || !settings.customApi.endpoint) {
    return;
  }

  const attachments = await collectAttachments();

  try {
    await fetch(settings.customApi.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels,
        attachments,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn("Failed to send to custom API:", error);
  }
}

async function collectAttachments(): Promise<AttachmentPayload[]> {
  const state = currentState.value;
  const recording = recordingState.value;
  const attachments: AttachmentPayload[] = [];

  // Screenshots
  const screenshots = state.screenshots || [];
  for (let i = 0; i < screenshots.length; i++) {
    attachments.push({
      filename: `screenshot-${i + 1}.png`,
      mimeType: "image/png",
      dataUrl: screenshots[i].dataUrl,
    });
  }

  // Recordings
  const recordings = state.recordings || [];
  for (let i = 0; i < recordings.length; i++) {
    const rec = recordings[i];
    const dataUrl = await blobUrlToDataUrl(rec.dataUrl);
    attachments.push({
      filename: `recording-${i + 1}.webm`,
      mimeType: "video/webm",
      dataUrl,
    });
  }

  // Current recording (if any)
  if (recording.objectUrl) {
    const dataUrl = await blobUrlToDataUrl(recording.objectUrl);
    attachments.push({
      filename: "recording-current.webm",
      mimeType: "video/webm",
      dataUrl,
    });
  }

  return attachments;
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
  const settings = issueCreationSettings.value;

  // ダウンロードパスのプレフィックス（末尾にスラッシュを確保）
  let pathPrefix = settings.downloadPathPrefix?.trim() || "";
  if (pathPrefix && !pathPrefix.endsWith("/")) {
    pathPrefix += "/";
  }

  const screenshots = state.screenshots || [];
  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];
    jobs.push(
      chrome.downloads.download({
        url: screenshot.dataUrl,
        filename: `${pathPrefix}${safeTitle}-${timestamp}-screenshot-${i + 1}.png`,
        saveAs: false,
      })
    );
  }

  const recordings = state.recordings || [];
  for (let i = 0; i < recordings.length; i++) {
    const rec = recordings[i];
    const recordingUrl = await blobUrlToDataUrl(rec.dataUrl);
    jobs.push(
      chrome.downloads.download({
        url: recordingUrl,
        filename: `${pathPrefix}${safeTitle}-${timestamp}-recording-${i + 1}.webm`,
        saveAs: false,
      })
    );
  }

  // Also handle any current recording that hasn't been finalized yet
  if (recording.objectUrl) {
    const recordingUrl = await blobUrlToDataUrl(recording.objectUrl);
    jobs.push(
      chrome.downloads.download({
        url: recordingUrl,
        filename: `${pathPrefix}${safeTitle}-${timestamp}-recording-current.webm`,
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
