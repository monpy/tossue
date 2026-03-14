import { signal, computed } from "@preact/signals";
import type {
  TabState,
  HelperState,
  RecordingState,
  IssueOptions,
} from "../../shared/types";
import { buildMarkdown } from "../utils/markdown";

export const DEFAULT_LABEL_PRESETS = ["bug", "needs-triage", "diagnostics", "ui", "high-priority"];

function createEmptyState(): TabState {
  return {
    selectedArea: null,
    captureRect: null,
    actions: [],
    actionHistoryPast: [],
    actionHistoryFuture: [],
    consoleEntries: [],
    networkEntries: [],
    screenshotDataUrl: "",
    draft: {
      repo: "",
      summary: "",
      currentBehavior: "",
      expectedBehavior: "",
      labels: [],
    },
  };
}

export const activeTabId = signal<number | null>(null);
export const currentState = signal<TabState>(createEmptyState());
export const currentHelper = signal<HelperState>({
  reachable: false,
  health: null,
  github: null,
  repositories: [],
});

export const recordingState = signal<RecordingState>({
  stream: null,
  recorder: null,
  chunks: [],
  objectUrl: "",
  canvas: null,
  context: null,
  framePending: Promise.resolve(),
});

export const issueOptions = signal<IssueOptions>({
  includeActions: true,
});

export const labelPresets = signal<string[]>([...DEFAULT_LABEL_PRESETS]);
export const selectedLabels = signal<Set<string>>(new Set());
export const statusMessage = signal<string>("");
export const captureStatusMessage = signal<string>("");

export const canUndo = computed(() => (currentState.value.actionHistoryPast?.length ?? 0) > 0);
export const canRedo = computed(() => (currentState.value.actionHistoryFuture?.length ?? 0) > 0);
export const hasActions = computed(() => (currentState.value.actions?.length ?? 0) > 0);

export const canCreateIssue = computed(() =>
  Boolean(
    currentHelper.value.reachable &&
      currentHelper.value.github?.gh_installed &&
      currentHelper.value.github?.authenticated
  )
);

export const issueTitle = computed(() =>
  currentState.value.draft.summary.split("\n")[0].trim().slice(0, 80) || "Bug report"
);

export const isRecording = computed(() =>
  recordingState.value.recorder !== null && recordingState.value.recorder.state !== "inactive"
);

export const hasRecording = computed(() =>
  recordingState.value.objectUrl !== ""
);

export const hasScreenshot = computed(() =>
  currentState.value.screenshotDataUrl !== ""
);

export const markdown = computed(() =>
  buildMarkdown({
    state: currentState.value,
    draft: {
      ...currentState.value.draft,
      labels: Array.from(selectedLabels.value),
    },
    issueOptions: issueOptions.value,
    hasRecording: hasRecording.value,
  })
);

export const pendingCaptureId = signal<number>(0);

export const selectAreaButtonText = signal<string>("Select Area");
export const captureButtonText = signal<string>("Start Capture");
export const recordingButtonText = signal<string>("Start Recording");
