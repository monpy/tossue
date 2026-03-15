import type { TabState, IssueOptions, IssueDraft } from "../../shared/types";
import { formatSelectedElement, formatDisplayUrl, formatActionMarkdownLine } from "./format";

type BuildMarkdownParams = {
  state: TabState;
  draft: IssueDraft;
  issueOptions: IssueOptions;
  hasRecording: boolean;
};

export function buildMarkdown(params: BuildMarkdownParams): string {
  const { state, draft, issueOptions, hasRecording } = params;
  const area = state.selectedArea;
  const actions = issueOptions.includeActions
    ? (state.actions || []).map((action, index) => formatActionMarkdownLine(action, index))
    : [];
  const diagnostics = [
    ...(state.consoleEntries || []).map((entry) => `- [console:${entry.level}] ${entry.message}`),
    ...(state.networkEntries || []).map((entry) => `- [network:${entry.status || "ERR"}] ${entry.method} ${entry.url}`)
  ];
  const sections: string[] = [];

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

  if (issueOptions.includeActions) {
    pushSection(sections, "Diagnostics", diagnostics);
  }

  const screenshotCount = state.screenshots?.length ?? 0;
  const recordingCount = state.recordings?.length ?? 0;
  const attachmentLines = [
    screenshotCount > 0 ? `- ${screenshotCount} screenshot(s) captured in extension panel.` : "",
    recordingCount > 0 || hasRecording ? `- ${recordingCount + (hasRecording && recordingCount === 0 ? 1 : 0)} screen recording(s) captured in extension panel.` : ""
  ];
  pushSection(sections, "Attachments", attachmentLines);

  return sections.join("\n\n");
}

function pushSection(output: string[], title: string, lines: string[]): void {
  const normalized = lines
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  if (!normalized.length) {
    return;
  }

  output.push(`## ${title}\n${normalized.join("\n")}`);
}
