const HELPER_BASE_URL = "http://127.0.0.1:47321";
const LABEL_STORAGE_KEY = "labelPresets";
const ISSUE_OPTIONS_STORAGE_KEY = "issueOptions";
const DEFAULT_LABEL_PRESETS = ["bug", "needs-triage", "diagnostics", "ui", "high-priority"];

const fields = {
  repo: document.querySelector("#repo"),
  summary: document.querySelector("#summary"),
  currentBehavior: document.querySelector("#currentBehavior"),
  expectedBehavior: document.querySelector("#expectedBehavior")
};

const repoOptions = document.querySelector("#repoOptions");
const labelPresetList = document.querySelector("#labelPresetList");
const customLabelInput = document.querySelector("#customLabelInput");
const addCustomLabelButton = document.querySelector("#addCustomLabel");
const areaSummary = document.querySelector("#areaSummary");
const actionsList = document.querySelector("#actionsList");
const includeActionsInIssueInput = document.querySelector("#includeActionsInIssue");
const clearActionsButton = document.querySelector("#clearActions");
const undoActionsButton = document.querySelector("#undoActions");
const redoActionsButton = document.querySelector("#redoActions");
const issueTitlePreview = document.querySelector("#issueTitlePreview");
const markdownPreview = document.querySelector("#markdownPreview");
const screenshotPreview = document.querySelector("#screenshotPreview");
const screenshotWrap = document.querySelector("#screenshotWrap");
const recordingPreview = document.querySelector("#recordingPreview");
const recordingWrap = document.querySelector("#recordingWrap");
const submitStatus = document.querySelector("#submitStatus");
const captureStatus = document.querySelector("#captureStatus");
const createIssueHint = document.querySelector("#createIssueHint");
const helperSummary = document.querySelector("#helperSummary");
const helperDetail = document.querySelector("#helperDetail");
const helperEndpoint = document.querySelector("#helperEndpoint");
const helperAccount = document.querySelector("#helperAccount");
const helperDot = document.querySelector("#helperDot");
const helperSummaryDot = document.querySelector("#helperSummaryDot");
const helperSummaryText = document.querySelector("#helperSummaryText");
const createIssueButton = document.querySelector("#createIssue");
const loginHelperButton = document.querySelector("#loginHelper");
const copyMarkdownButton = document.querySelector("#copyMarkdown");
const recordingButton = document.querySelector("#toggleRecording");
const selectAreaButton = document.querySelector("#selectArea");
const captureImageButton = document.querySelector("#captureScreenshot");
const clearScreenshotButton = document.querySelector("#clearScreenshot");
const clearRecordingButton = document.querySelector("#clearRecording");

let selectedLabels = new Set();
let labelPresets = [...DEFAULT_LABEL_PRESETS];
let pendingCaptureId = 0;
let issueOptions = {
  includeActions: true
};
let recordingState = {
  stream: null,
  recorder: null,
  chunks: [],
  objectUrl: "",
  canvas: null,
  context: null,
  framePending: Promise.resolve()
};

let activeTabId = null;
let currentState = null;
let currentHelper = {
  reachable: false,
  health: null,
  github: null,
  repositories: []
};

document.querySelector("#refreshState").addEventListener("click", refreshState);
document.querySelector("#refreshHelper").addEventListener("click", refreshHelperState);
loginHelperButton.addEventListener("click", startHelperLogin);
selectAreaButton.addEventListener("click", startAreaPicker);
captureImageButton.addEventListener("click", startCaptureMode);
recordingButton.addEventListener("click", toggleRecording);
clearScreenshotButton.addEventListener("click", clearScreenshotPreview);
clearRecordingButton.addEventListener("click", clearRecordingPreview);
clearActionsButton.addEventListener("click", clearActions);
undoActionsButton.addEventListener("click", undoActions);
redoActionsButton.addEventListener("click", redoActions);
includeActionsInIssueInput.addEventListener("change", handleIssueOptionsChange);
areaSummary.addEventListener("mouseenter", handleAreaHoverStart);
areaSummary.addEventListener("mouseleave", handleAreaHoverEnd);
areaSummary.addEventListener("focusin", handleAreaHoverStart);
areaSummary.addEventListener("focusout", handleAreaHoverEnd);
actionsList.addEventListener("click", handleActionTimelineClick);
actionsList.addEventListener("mouseover", handleActionTimelineHover);
actionsList.addEventListener("mouseout", handleActionTimelineLeave);
actionsList.addEventListener("focusin", handleActionTimelineHover);
actionsList.addEventListener("focusout", handleActionTimelineLeave);
document.querySelector("#createIssue").addEventListener("click", createIssue);
copyMarkdownButton.addEventListener("click", copyMarkdown);
addCustomLabelButton.addEventListener("click", addCustomLabel);
customLabelInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomLabel();
  }
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", persistDraft);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TAB_RECORDING_FRAME" && message.tabId === activeTabId) {
    drawRecordingFrame(message.data, message.metadata);
    return;
  }

  if (message.type === "TAB_RECORDING_STOPPED" && message.tabId === activeTabId) {
    if (recordingState.recorder && recordingState.recorder.state !== "inactive") {
      recordingState.recorder.stop();
    }
    recordingButton.textContent = "Start Recording";
    return;
  }

  if (message.type !== "STATE_UPDATED") {
    return;
  }

  if (message.tabId !== activeTabId) {
    return;
  }

  const nextState = message.state;
  const shouldHydrate = !draftsEqual(currentState?.draft, nextState?.draft);
  currentState = nextState;
  if (shouldHydrate) {
    hydrateForm(currentState.draft);
  }
  renderState();
});

bootstrap().catch((error) => {
  submitStatus.textContent = error.message;
});

async function bootstrap() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  await Promise.all([loadLabelPresets(), loadIssueOptions()]);
  await Promise.all([refreshState(), refreshHelperState()]);
}

async function refreshState() {
  const response = await chrome.runtime.sendMessage({
    type: "GET_ACTIVE_TAB_STATE",
    tabId: activeTabId
  });

  if (!response.ok) {
    throw new Error(response.error);
  }

  currentState = response.state;
  hydrateForm(currentState.draft);
  renderState();
}

async function persistDraft(options = {}) {
  const draft = readDraft();
  await chrome.runtime.sendMessage({
    type: "STORE_FORM",
    tabId: activeTabId,
    payload: draft
  });

  currentState = { ...currentState, draft };
  renderMarkdown();
}

async function startAreaPicker() {
  await chrome.runtime.sendMessage({
    type: "START_AREA_PICKER",
    tabId: activeTabId
  });

  captureStatus.textContent = "Area picker started. Click an element on the page to select it.";
  selectAreaButton.textContent = "Selecting...";
}

async function startCaptureMode() {
  await chrome.runtime.sendMessage({
    type: "START_CAPTURE_PICKER",
    tabId: activeTabId
  });

  captureStatus.textContent = "Capture mode started. Drag on the page to capture a rectangle.";
  captureImageButton.textContent = "Capturing...";
}

async function captureScreenshot(rectSelection) {
  const selection = rectSelection || currentState?.captureRect;
  if (!selection?.rect) {
    captureStatus.textContent = "Start Capture を押して、ページ上で保存したい範囲をドラッグしてください。";
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "CAPTURE_SCREENSHOT",
    tabId: activeTabId
  });

  if (!response.ok) {
    captureStatus.textContent = response.error;
    return;
  }

  const croppedScreenshot = await cropSelectedArea(response.screenshotDataUrl, selection);
  currentState = { ...currentState, screenshotDataUrl: croppedScreenshot };
  renderState();
  captureStatus.textContent = "Captured image saved in the panel preview.";
  captureImageButton.textContent = "Start Capture";
}

async function toggleRecording() {
  if (recordingState.recorder && recordingState.recorder.state !== "inactive") {
    await stopDebuggerRecording();
    recordingState.recorder.stop();
    recordingButton.textContent = "Start Recording";
    captureStatus.textContent = "Stopping recording...";
    return;
  }

  try {
    const startResponse = await chrome.runtime.sendMessage({
      type: "START_TAB_RECORDING",
      tabId: activeTabId
    });
    if (!startResponse?.ok) {
      throw new Error(startResponse?.error || "Failed to start current-tab recording.");
    }

    const { canvas, stream } = createRecordingCanvasStream();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recordingState = {
      stream,
      recorder,
      chunks: [],
      objectUrl: recordingState.objectUrl,
      canvas,
      context: canvas.getContext("2d"),
      framePending: Promise.resolve()
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        recordingState.chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      finalizeRecording();
    });

    recorder.start();
    recordingButton.textContent = "Stop Recording";
    captureStatus.textContent = "Current tab recording started.";
  } catch (error) {
    captureStatus.textContent = error.message;
  }
}

async function clearScreenshotPreview() {
  const response = await chrome.runtime.sendMessage({
    type: "CLEAR_SCREENSHOT",
    tabId: activeTabId
  });

  if (!response.ok) {
    captureStatus.textContent = response.error;
    return;
  }

  currentState = response.state;
  renderState();
  captureStatus.textContent = "Captured image removed.";
}

async function clearActions() {
  await mutateActionTimeline("CLEAR_ACTIONS");
}

async function undoActions() {
  await mutateActionTimeline("UNDO_ACTION_EDIT");
}

async function redoActions() {
  await mutateActionTimeline("REDO_ACTION_EDIT");
}

async function mutateActionTimeline(type, payload = undefined) {
  const response = await chrome.runtime.sendMessage({
    type,
    tabId: activeTabId,
    payload
  });

  if (!response.ok) {
    submitStatus.textContent = response.error;
    return;
  }

  currentState = response.state;
  renderState();
}

function clearRecordingPreview() {
  if (recordingState.recorder && recordingState.recorder.state !== "inactive") {
    return;
  }

  if (recordingState.objectUrl) {
    URL.revokeObjectURL(recordingState.objectUrl);
  }

  recordingState.objectUrl = "";
  recordingPreview.src = "";
  recordingWrap.classList.add("hidden");
  captureStatus.textContent = "Recorded preview removed.";
}

async function openCreatedIssue(issueUrl) {
  if (!issueUrl) {
    return;
  }

  await chrome.windows.create({
    url: issueUrl,
    focused: true,
    type: "normal"
  });
}

async function downloadIssueAttachments(title) {
  const jobs = [];
  const safeTitle = sanitizeFilename(title || "tossue-issue");
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  if (currentState?.screenshotDataUrl) {
    jobs.push(
      chrome.downloads.download({
        url: currentState.screenshotDataUrl,
        filename: `Tossue/${safeTitle}-${timestamp}.png`,
        saveAs: false
      })
    );
  }

  if (recordingState.objectUrl) {
    const recordingUrl = await blobUrlToDataUrl(recordingState.objectUrl);
    jobs.push(
      chrome.downloads.download({
        url: recordingUrl,
        filename: `Tossue/${safeTitle}-${timestamp}.webm`,
        saveAs: false
      })
    );
  }

  await Promise.all(jobs);
  return jobs.length;
}

function buildIssueCreatedMessage(issueUrl, opened, attachmentCount) {
  if (!attachmentCount) {
    return opened ? `Created and opened: ${issueUrl}` : `Created: ${issueUrl}`;
  }

  return `${opened ? "Created and opened" : "Created"}: ${issueUrl} | Downloaded ${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}.`;
}

function sanitizeFilename(value) {
  return String(value || "tossue-issue")
    .trim()
    .slice(0, 80)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "tossue-issue";
}

async function blobUrlToDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to prepare attachment download."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

async function createIssue() {
  const draft = readDraft();
  const labels = draft.labels.map((label) => String(label || "").trim()).filter(Boolean);

  if (!currentHelper.reachable) {
    submitStatus.textContent = "Tossue Helper is not reachable. Use Copy and create the issue manually.";
    return;
  }

  if (!currentHelper.github?.gh_installed) {
    submitStatus.textContent = "Tossue Helper is reachable, but gh is not installed on this machine.";
    return;
  }

  if (!currentHelper.github?.authenticated) {
    submitStatus.textContent = "GitHub CLI is not authenticated in Tossue Helper. Run gh auth login first.";
    return;
  }

  if (!draft.repo) {
    submitStatus.textContent = "Select or enter a repository before creating the issue.";
    return;
  }

  if (!draft.summary) {
    submitStatus.textContent = "Issue Title を入力してから Issue を作成してください。";
    return;
  }
  const body = buildMarkdown();
  const title = deriveIssueTitle();

  submitStatus.textContent = "Creating issue...";

  try {
    const response = await fetch(`${HELPER_BASE_URL}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repo: draft.repo,
        title,
        body,
        labels
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      submitStatus.textContent = payload.error || "Tossue Helper failed to create the issue.";
      return;
    }

    const [openResult, downloadResult] = await Promise.allSettled([
      openCreatedIssue(payload.issue_url),
      downloadIssueAttachments(title)
    ]);

    submitStatus.textContent = buildIssueCreatedMessage(
      payload.issue_url,
      openResult.status === "fulfilled",
      downloadResult.status === "fulfilled" ? downloadResult.value : 0
    );
  } catch (error) {
    submitStatus.textContent = error.message;
  }
}

async function copyMarkdown() {
  await navigator.clipboard.writeText(buildMarkdown());
  submitStatus.textContent = "Markdown copied.";
}

async function startHelperLogin() {
  submitStatus.textContent = "Opening gh auth login in Tossue Helper...";

  try {
    const response = await helperPost("/github/login");
    submitStatus.textContent = response.message;
    await refreshHelperState();
  } catch (error) {
    submitStatus.textContent = error.message;
  }
}

function hydrateForm(draft) {
  Object.entries(fields).forEach(([key, field]) => {
    field.value = draft?.[key] || "";
  });
  hydrateLabels(draft?.labels || "");
}

function draftsEqual(left, right) {
  const normalize = (draft) => JSON.stringify({
    repo: draft?.repo || "",
    summary: draft?.summary || "",
    currentBehavior: draft?.currentBehavior || "",
    expectedBehavior: draft?.expectedBehavior || "",
    labels: Array.isArray(draft?.labels) ? [...draft.labels].sort() : []
  });

  return normalize(left) === normalize(right);
}

async function refreshHelperState() {
  helperSummary.textContent = "Checking Tossue Helper...";
  helperDetail.textContent = "127.0.0.1:47321 の状態を確認しています。";
  helperSummaryText.textContent = "Checking...";
  setHelperDots("helper-dot");

  try {
    const health = await helperGet("/health");
    const github = await helperGet("/github/status");
    let repositories = [];

    if (github.authenticated) {
      const repoResult = await helperGet("/github/repositories");
      repositories = repoResult.repositories || [];
    }

    currentHelper = {
      reachable: Boolean(health.ok),
      health,
      github,
      repositories
    };
  } catch (error) {
    currentHelper = {
      reachable: false,
      health: null,
      github: null,
      repositories: []
    };
    helperDetail.textContent = error.message;
  }

  renderHelperState();
}

function readDraft() {
  return {
    ...Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.value.trim()])
    ),
    labels: Array.from(selectedLabels)
  };
}

function renderState() {
  renderLabels();
  renderArea();
  renderActions();
  renderScreenshot();
  renderRecording();
  renderMarkdown();
  maybeProcessCaptureRect();
}

function renderHelperState() {
  repoOptions.innerHTML = "";
  loginHelperButton.classList.add("hidden");
  loginHelperButton.disabled = false;

  const endpointText = currentHelper.health?.port
    ? `Endpoint: 127.0.0.1:${currentHelper.health.port}`
    : "Endpoint: 127.0.0.1:47321";
  helperEndpoint.textContent = endpointText;
  helperAccount.textContent = "Account: -";

  if (!currentHelper.reachable) {
    setHelperDots("helper-dot warn");
    helperSummary.textContent = "Tossue Helper is offline";
    helperSummaryText.textContent = "Offline";
    helperDetail.textContent = "localhost helper に接続できません。`Copy` で手動投稿してください。";
    createIssueHint.textContent = "Helper に接続できないため、Issue の直接作成は無効です。`Copy` を使って手動投稿してください。";
    syncIssueActionButtons(false);
    return;
  }

  if (!currentHelper.github?.gh_installed) {
    setHelperDots("helper-dot warn");
    helperSummary.textContent = "Helper is reachable, but gh is not installed";
    helperSummaryText.textContent = "gh Missing";
    helperDetail.textContent = "Tossue Helper は応答していますが、このマシンで `gh` コマンドが見つかりません。";
    createIssueHint.textContent = "helper は動作していますが `gh` が未インストールのため、Issue の直接作成はできません。";
    syncIssueActionButtons(false);
    return;
  }

  if (!currentHelper.github?.authenticated) {
    setHelperDots("helper-dot warn");
    helperSummary.textContent = "GitHub CLI login is required";
    helperSummaryText.textContent = "Login Required";
    helperDetail.textContent = currentHelper.github?.error || "Run gh auth login.";
    loginHelperButton.classList.remove("hidden");
    createIssueHint.textContent = "helper は動作していますが、GitHub CLI のログインが必要です。`Login via Helper` の後に `Refresh Helper` してください。";
    syncIssueActionButtons(false);
    return;
  }

  const name = currentHelper.github.name
    ? `${currentHelper.github.name} (@${currentHelper.github.login})`
    : `@${currentHelper.github.login}`;
  setHelperDots("helper-dot ok");
  helperSummary.textContent = "Tossue Helper is ready";
  helperSummaryText.textContent = "Ready";
  helperDetail.textContent = `${currentHelper.repositories.length} repositories loaded and ready for issue creation.`;
  helperAccount.textContent = `Account: ${name}`;
  createIssueHint.textContent = "helper と GitHub CLI に疎通できています。直接 Issue を作成できます。";
  syncIssueActionButtons(true);

  for (const repository of currentHelper.repositories) {
    const option = document.createElement("option");
    option.value = repository.name_with_owner;
    repoOptions.appendChild(option);
  }
}

function setHelperDots(className) {
  helperDot.className = className;
  helperSummaryDot.className = className;
}

async function helperGet(path) {
  const response = await fetch(`${HELPER_BASE_URL}${path}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

async function helperPost(path) {
  const response = await fetch(`${HELPER_BASE_URL}${path}`, {
    method: "POST"
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Helper request failed: ${path}`);
  }
  return payload;
}

function renderArea() {
  const area = currentState?.selectedArea;
  captureImageButton.disabled = false;

  if (!area) {
    areaSummary.classList.add("empty");
    areaSummary.classList.add("hidden");
    selectAreaButton.textContent = "Select Area";
    if (!currentState?.captureRect) {
      captureStatus.textContent = "Select Area は DOM 要素選択、Start Capture は画面上の矩形キャプチャです。";
    }
    return;
  }

  areaSummary.classList.remove("empty");
  areaSummary.classList.remove("hidden");
  selectAreaButton.textContent = "Select Again";
  areaSummary.innerHTML = buildAreaSummaryMarkup(area);
  if (!currentState?.captureRect) {
    captureStatus.textContent = "Area selected. Start Capture で画面上の矩形を保存できます。";
  }
}

function renderActions() {
  const actions = currentState?.actions || [];
  const shouldStickToBottom = isNearActionsBottom();
  actionsList.innerHTML = "";

  undoActionsButton.disabled = !(currentState?.actionHistoryPast?.length);
  redoActionsButton.disabled = !(currentState?.actionHistoryFuture?.length);
  clearActionsButton.disabled = actions.length === 0;

  actions.forEach((action, index) => {
    if (index > 0) {
      const cutLine = document.createElement("button");
      cutLine.type = "button";
      cutLine.className = "action-cutline";
      cutLine.dataset.actionCommand = "trim-before";
      cutLine.dataset.actionId = action.id;
      cutLine.setAttribute("aria-label", "Delete actions above this line");
      cutLine.innerHTML = `<span class="action-cutline-icon">✂</span><span class="action-cutline-rule"></span>`;
      actionsList.appendChild(cutLine);
    }

    const row = document.createElement("article");
    row.className = "action-row";
    row.dataset.actionId = action.id;
    if (action.targetInfo) {
      row.dataset.highlightable = "true";
    }

    const label = formatActionTitle(action);
    const detail = formatActionDetail(action);
    row.innerHTML = `
      <span class="action-row-index">${escapeHtml(formatActionIndex(index + 1))}</span>
      <div class="action-row-copy">
        <strong class="action-row-title">${escapeHtml(label)}</strong>
        ${detail ? `<span class="action-row-detail">${escapeHtml(detail)}</span>` : ""}
      </div>
      <button class="action-icon-button" type="button" data-action-command="delete" aria-label="Delete action">×</button>
    `;
    actionsList.appendChild(row);
  });

  if (shouldStickToBottom) {
    actionsList.scrollTop = actionsList.scrollHeight;
  }
}

function renderScreenshot() {
  if (!currentState?.screenshotDataUrl) {
    screenshotWrap.classList.add("hidden");
    screenshotPreview.src = "";
    return;
  }

  screenshotWrap.classList.remove("hidden");
  screenshotPreview.src = currentState.screenshotDataUrl;
}

function renderRecording() {
  if (!recordingState.objectUrl) {
    recordingWrap.classList.add("hidden");
    recordingPreview.src = "";
    return;
  }

  recordingWrap.classList.remove("hidden");
  recordingPreview.src = recordingState.objectUrl;
}

function maybeProcessCaptureRect() {
  const captureRect = currentState?.captureRect;
  if (!captureRect?.capturedAt || captureRect.capturedAt === pendingCaptureId) {
    return;
  }

  pendingCaptureId = captureRect.capturedAt;
  captureScreenshot(captureRect).catch((error) => {
    captureStatus.textContent = error.message;
    captureImageButton.textContent = "Start Capture";
  });
}

function buildMarkdown() {
  const draft = readDraft();
  const area = currentState?.selectedArea;
  const actions = issueOptions.includeActions
    ? (currentState?.actions || []).map((action, index) => formatActionMarkdownLine(action, index))
    : [];
  const diagnostics = [
    ...(currentState?.consoleEntries || []).map((entry) => `- [console:${entry.level}] ${entry.message}`),
    ...(currentState?.networkEntries || []).map((entry) => `- [network:${entry.status || "ERR"}] ${entry.method} ${entry.url}`)
  ];
  const sections = [];

  pushSection(sections, "Current Behavior", [draft.currentBehavior]);
  pushSection(sections, "Expected Behavior", [draft.expectedBehavior]);

  const selectedAreaLines = [
    area?.url ? `- URL: ${formatDisplayUrl(area.url)}` : "",
    area ? `- Element: ${formatSelectedElement(area)}` : "",
    area?.textSnippet ? `- Text: ${area.textSnippet}` : "",
    area?.framework?.framework && area.framework.framework !== "DOM" ? `- Framework: ${area.framework.framework}` : "",
    area?.framework?.selectedComponent ? `- Component: ${area.framework.selectedComponent}` : "",
    area?.framework?.componentTrail?.length
      ? `- Component Tree: ${area.framework.componentTrail.join(" > ")}`
      : ""
  ];
  pushSection(sections, "Selected Area", selectedAreaLines);

  if (issueOptions.includeActions) {
    pushSection(sections, "Recent Actions", actions);
  }

  const pageContextLines = [
    area?.pageTitle ? `- Page Title: ${area.pageTitle}` : "",
    area?.url ? `- URL: ${formatDisplayUrl(area.url)}` : ""
  ];
  pushSection(sections, "Page Context", pageContextLines);

  const browserContextLines = [
    area?.browser ? `- Browser: ${area.browser}` : "",
    area?.viewport ? `- Viewport: ${area.viewport.width}x${area.viewport.height}` : "",
    `- Captured At: ${new Date().toISOString()}`,
    draft.labels.length ? `- Labels: ${draft.labels.join(", ")}` : ""
  ];
  pushSection(sections, "Browser Context", browserContextLines);

  pushSection(sections, "Diagnostics", diagnostics);

  const attachmentLines = [
    currentState?.screenshotDataUrl ? "- Screenshot captured in extension panel." : "",
    recordingState.objectUrl ? "- Screen recording captured in extension panel." : ""
  ];
  pushSection(sections, "Attachments", attachmentLines);

  return sections.join("\n\n");
}

function pushSection(output, title, lines) {
  const normalized = lines
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  if (!normalized.length) {
    return;
  }

  output.push(`## ${title}\n${normalized.join("\n")}`);
}

function formatActionTitle(action) {
  if (action.kind === "navigation") {
    return "Page |";
  }

  if (action.type === "click" && action.href) {
    return `click link | ${action.target || ""}`.trim();
  }

  return `${action.type || "action"} | ${action.target || ""}`.trim();
}

function formatActionDetail(action) {
  if (action.kind === "navigation") {
    return simplifyUrl(action.target || "");
  }

  return "";
}

function formatActionMarkdownLine(action, index) {
  if (action.kind === "navigation") {
    return `${index + 1}. navigation | ${action.navigationKind || "url change"} | ${action.target || "-"}`;
  }

  return `${index + 1}. ${action.type} | ${action.target || "-"} | ${action.valueSnippet || "-"}`;
}

async function handleActionTimelineClick(event) {
  const button = event.target.closest("[data-action-command]");
  if (!button) {
    return;
  }

  const targetNode = button.closest("[data-action-id]");
  const id = targetNode?.dataset.actionId || button.dataset.actionId;
  const command = button.dataset.actionCommand;
  if (!id || !command) {
    return;
  }

  if (command === "delete") {
    await mutateActionTimeline("DELETE_ACTION", { id });
    return;
  }

  if (command === "trim-before") {
    await mutateActionTimeline("TRIM_ACTIONS_BEFORE", { id });
  }
}

function handleActionTimelineHover(event) {
  const card = event.target.closest("[data-action-id]");
  if (!card) {
    return;
  }
  if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) {
    return;
  }

  const action = findActionById(card.dataset.actionId);
  if (!action?.targetInfo) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "HIGHLIGHT_SELECTED_AREA",
    tabId: activeTabId,
    payload: action.targetInfo
  }).catch(() => {});
}

function handleActionTimelineLeave(event) {
  const card = event.target.closest("[data-action-id]");
  if (!card) {
    return;
  }
  if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "CLEAR_SELECTED_AREA_HIGHLIGHT",
    tabId: activeTabId
  }).catch(() => {});
}

function findActionById(id) {
  return (currentState?.actions || []).find((action) => action.id === id) || null;
}

function formatActionIndex(index) {
  const digits = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
  return digits[index] || `${index}.`;
}

function isNearActionsBottom() {
  const threshold = 40;
  return actionsList.scrollTop + actionsList.clientHeight >= actionsList.scrollHeight - threshold;
}

function buildAreaSummaryMarkup(area) {
  const primaryName = area.framework?.selectedComponent || formatSelectedElement(area);
  const summaryLines = [
    `<div class="area-head">`,
    `<div class="area-title-row">`,
    `<strong class="area-title">${escapeHtml(primaryName)}</strong>`,
    area.framework?.framework ? `<span class="area-chip">${escapeHtml(area.framework.framework)}</span>` : "",
    `</div>`,
    `</div>`
  ];

  if (area.framework?.selectedComponent && primaryName !== formatSelectedElement(area)) {
    summaryLines.push(`<p class="area-subtle">${escapeHtml(formatSelectedElement(area))}</p>`);
  }

  return summaryLines.filter(Boolean).join("");
}

function formatSelectedElement(area) {
  if (!area) {
    return "-";
  }

  const parts = [area.tagName || "element"];
  if (area.id) {
    parts.push(`#${area.id}`);
  } else if (Array.isArray(area.classes) && area.classes.length) {
    parts.push(`.${area.classes.slice(0, 2).join(".")}`);
  }
  return parts.join("");
}

async function handleAreaHoverStart() {
  const area = currentState?.selectedArea;
  if (!activeTabId || !area || areaSummary.classList.contains("empty")) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: "HIGHLIGHT_SELECTED_AREA",
      tabId: activeTabId,
      payload: area
    });
  } catch (_error) {}
}

async function handleAreaHoverEnd() {
  if (!activeTabId) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: "CLEAR_SELECTED_AREA_HIGHLIGHT",
      tabId: activeTabId
    });
  } catch (_error) {}
}

function simplifyUrl(value) {
  if (!value) {
    return "-";
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${decodeUrlPath(url.pathname)}${decodeUrlComponent(url.search)}${decodeUrlComponent(url.hash)}`.slice(0, 96);
  } catch (_error) {
    return decodeUrlComponent(String(value)).slice(0, 96);
  }
}

function formatDisplayUrl(value) {
  if (!value) {
    return "-";
  }

  try {
    const url = new URL(value);
    return `${url.origin}${decodeUrlPath(url.pathname)}${decodeUrlComponent(url.search)}${decodeUrlComponent(url.hash)}`;
  } catch (_error) {
    return decodeUrlComponent(String(value));
  }
}

function decodeUrlPath(value) {
  try {
    return decodeURI(value);
  } catch (_error) {
    return value;
  }
}

function decodeUrlComponent(value) {
  try {
    return decodeURI(value);
  } catch (_error) {
    return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function cropSelectedArea(dataUrl, area) {
  const image = await loadImage(dataUrl);
  const viewport = area.viewport || {
    width: image.width,
    height: image.height,
    devicePixelRatio: 1
  };
  const scaleX = image.width / Math.max(viewport.width, 1);
  const scaleY = image.height / Math.max(viewport.height, 1);
  const sx = Math.max(0, Math.round(area.rect.x * scaleX));
  const sy = Math.max(0, Math.round(area.rect.y * scaleY));
  const sw = Math.max(1, Math.round(area.rect.width * scaleX));
  const sh = Math.max(1, Math.round(area.rect.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode captured screenshot."));
    image.src = dataUrl;
  });
}

function finalizeRecording() {
  if (recordingState.objectUrl) {
    URL.revokeObjectURL(recordingState.objectUrl);
  }

  const blob = new Blob(recordingState.chunks, {
    type: recordingState.recorder?.mimeType || "video/webm"
  });
  const objectUrl = URL.createObjectURL(blob);
  recordingState.objectUrl = objectUrl;
  recordingPreview.src = objectUrl;
  recordingWrap.classList.remove("hidden");
  recordingButton.textContent = "Start Recording";
  captureStatus.textContent = "Recording saved in the panel preview for human review.";

  for (const track of recordingState.stream?.getTracks() || []) {
    track.stop();
  }

  recordingState.stream = null;
  recordingState.recorder = null;
  recordingState.chunks = [];
  recordingState.canvas = null;
  recordingState.context = null;
  recordingState.framePending = Promise.resolve();
}

function createRecordingCanvasStream() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(10);
  return { canvas, stream };
}

function drawRecordingFrame(base64Data, metadata) {
  if (!recordingState.canvas || !recordingState.context) {
    return;
  }

  recordingState.framePending = recordingState.framePending
    .then(async () => {
      const bitmap = await decodeFrame(base64Data);
      const width = Math.max(1, metadata?.deviceWidth || bitmap.width);
      const height = Math.max(1, metadata?.deviceHeight || bitmap.height);

      if (recordingState.canvas.width !== width || recordingState.canvas.height !== height) {
        recordingState.canvas.width = width;
        recordingState.canvas.height = height;
      }

      recordingState.context.clearRect(0, 0, width, height);
      recordingState.context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
    })
    .catch(() => {});
}

async function decodeFrame(base64Data) {
  const response = await fetch(`data:image/jpeg;base64,${base64Data}`);
  const blob = await response.blob();
  return await createImageBitmap(blob);
}

async function stopDebuggerRecording() {
  try {
    await chrome.runtime.sendMessage({
      type: "STOP_TAB_RECORDING",
      tabId: activeTabId
    });
  } catch (_error) {}
}

function buildAiPrompt() {
  const draftMarkdown = buildMarkdown();
  return [
    "You are preparing a GitHub issue draft for a browser debugging report.",
    "Return concise Japanese text.",
    "Keep facts only. Do not invent behavior or stack traces.",
    "Generate a short GitHub issue title, a refined summary, a refined expected behavior, and final markdown.",
    "The markdown MUST include '## Summary' and '## Expected Behavior'.",
    "When source data exists, include '## Selected Area', '## Page Context', and '## Browser Context'.",
    "Omit empty sections. If Framework, Component, Component Tree, Diagnostics, or Attachments are empty, do not include them in the markdown.",
    "Keep Page Context and Browser Context when available.",
    "Do not include a Current Behavior section.",
    "",
    `Summary: ${fields.summary.value}`,
    `Expected Behavior: ${fields.expectedBehavior.value}`,
    `Selected Area: ${JSON.stringify(currentState?.selectedArea || {})}`,
    `Recent Actions: ${JSON.stringify(currentState?.actions || [])}`,
    `Include Recent Actions In Issue: ${issueOptions.includeActions}`,
    `Diagnostics: ${JSON.stringify({
      consoleEntries: currentState?.consoleEntries || [],
      networkEntries: currentState?.networkEntries || []
    })}`,
    `Draft Markdown Template:\n${draftMarkdown}`,
    "",
    "Return JSON only."
  ].join("\n");
}

async function loadLabelPresets() {
  const stored = await chrome.storage.local.get(LABEL_STORAGE_KEY);
  const saved = Array.isArray(stored[LABEL_STORAGE_KEY]) ? stored[LABEL_STORAGE_KEY] : [];
  labelPresets = Array.from(new Set([...DEFAULT_LABEL_PRESETS, ...saved.filter(Boolean)]));
}

async function loadIssueOptions() {
  const stored = await chrome.storage.local.get(ISSUE_OPTIONS_STORAGE_KEY);
  const saved = stored[ISSUE_OPTIONS_STORAGE_KEY];
  issueOptions = {
    includeActions: saved?.includeActions !== false
  };
  includeActionsInIssueInput.checked = issueOptions.includeActions;
}

async function handleIssueOptionsChange() {
  issueOptions.includeActions = includeActionsInIssueInput.checked;
  await chrome.storage.local.set({
    [ISSUE_OPTIONS_STORAGE_KEY]: issueOptions
  });
  renderMarkdown();
}

function syncIssueActionButtons(canCreateIssue) {
  copyMarkdownButton.disabled = false;
  createIssueButton.disabled = !canCreateIssue;
}

function canDirectCreateIssue() {
  return Boolean(
    currentHelper.reachable &&
      currentHelper.github?.gh_installed &&
      currentHelper.github?.authenticated
  );
}

function deriveIssueTitle() {
  return readDraft().summary.split("\n")[0].trim().slice(0, 80) || "Bug report";
}

function renderMarkdown() {
  issueTitlePreview.value = deriveIssueTitle();
  markdownPreview.value = buildMarkdown();
}


async function saveLabelPresets() {
  await chrome.storage.local.set({
    [LABEL_STORAGE_KEY]: labelPresets
  });
}

function hydrateLabels(labelsValue) {
  const labels = Array.isArray(labelsValue)
    ? labelsValue
    : String(labelsValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  for (const label of labels) {
    if (!labelPresets.includes(label)) {
      labelPresets.push(label);
    }
  }

  selectedLabels = new Set(labels);
  renderLabels();
}

function renderLabels() {
  labelPresetList.innerHTML = "";

  for (const label of labelPresets) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `label-chip${selectedLabels.has(label) ? " active" : ""}${DEFAULT_LABEL_PRESETS.includes(label) ? "" : " custom"}`;
    chip.title = label;
    chip.addEventListener("click", () => {
      toggleLabel(label);
    });

    const chipLabel = document.createElement("span");
    chipLabel.textContent = label;
    chip.appendChild(chipLabel);

    if (!DEFAULT_LABEL_PRESETS.includes(label)) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "label-chip-remove";
      removeButton.textContent = "×";
      removeButton.title = `Remove ${label}`;
      removeButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        await removeCustomLabel(label);
      });
      chip.appendChild(removeButton);
    }

    labelPresetList.appendChild(chip);
  }
}

function toggleLabel(label) {
  if (selectedLabels.has(label)) {
    selectedLabels.delete(label);
  } else {
    selectedLabels.add(label);
  }

  persistDraft();
  renderLabels();
}

async function addCustomLabel() {
  const label = customLabelInput.value.trim();
  if (!label) {
    return;
  }

  if (!labelPresets.includes(label)) {
    labelPresets.push(label);
    await saveLabelPresets();
  }

  selectedLabels.add(label);
  customLabelInput.value = "";
  await persistDraft();
  renderLabels();
}

async function removeCustomLabel(label) {
  if (DEFAULT_LABEL_PRESETS.includes(label)) {
    toggleLabel(label);
    return;
  }

  labelPresets = labelPresets.filter((item) => item !== label);
  selectedLabels.delete(label);
  await saveLabelPresets();
  await persistDraft();
  renderLabels();
}
