import { signal, computed } from "@preact/signals";
import type {
  TabState,
  HelperState,
  RecordingState,
  IssueOptions,
  DevtoolsStatus,
  UserAction,
  ConsoleEntry,
  NetworkEntry,
  RepositoryLabel,
  IssueCreationSettings,
  GitHubOAuthState,
  GitHubOAuthRepository,
} from "../../shared/types";
import { DEFAULT_ISSUE_CREATION_SETTINGS } from "../../shared/types";
import { buildMarkdown } from "../utils/markdown";

export type TimelineEntry =
  | { kind: "action"; data: UserAction }
  | { kind: "console"; data: ConsoleEntry & { id: string } }
  | { kind: "network"; data: NetworkEntry & { id: string } };

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
    screenshots: [],
    recordings: [],
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

// Helper authentication state
export const helperAuthState = signal<{
  authenticated: boolean;
  token: string | null;
}>({
  authenticated: false,
  token: null,
});

// Upload script state (for Helper mode)
export const uploadScriptState = signal<{
  configured: boolean;
  enabled: boolean;
}>({
  configured: false,
  enabled: false,
});

// For backward compatibility and convenience
export const uploadScriptConfigured = computed(() =>
  uploadScriptState.value.configured && uploadScriptState.value.enabled
);

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
export const repositoryLabels = signal<RepositoryLabel[]>([]);
export const isLoadingLabels = signal<boolean>(false);
export const statusMessage = signal<string>("");
export const captureStatusMessage = signal<string>("");

// Per-tool status messages
export const selectAreaStatus = signal<string>("");
export const captureImageStatus = signal<string>("");
export const recordingStatus = signal<string>("");

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
  (currentState.value.recordings?.length ?? 0) > 0 || recordingState.value.objectUrl !== ""
);

export const hasScreenshot = computed(() =>
  (currentState.value.screenshots?.length ?? 0) > 0
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

export const isSelectingArea = signal<boolean>(false);
export const isCapturing = signal<boolean>(false);

export const devtoolsStatus = signal<DevtoolsStatus>({
  panelOpen: false,
  debuggerAttached: false,
});

export const unifiedTimeline = computed<TimelineEntry[]>(() => {
  const state = currentState.value;
  const entries: TimelineEntry[] = [];

  // Add actions
  for (const action of state.actions || []) {
    entries.push({ kind: "action", data: action });
  }

  // Add console entries with generated IDs
  for (let i = 0; i < (state.consoleEntries || []).length; i++) {
    const entry = state.consoleEntries[i];
    entries.push({
      kind: "console",
      data: { ...entry, id: `console-${i}-${entry.at}` },
    });
  }

  // Add network entries with generated IDs
  for (let i = 0; i < (state.networkEntries || []).length; i++) {
    const entry = state.networkEntries[i];
    entries.push({
      kind: "network",
      data: { ...entry, id: `network-${i}-${entry.at}` },
    });
  }

  // Sort by timestamp
  entries.sort((a, b) => {
    const timeA = new Date(a.data.at).getTime();
    const timeB = new Date(b.data.at).getTime();
    return timeA - timeB;
  });

  return entries;
});

export const hasTimelineEntries = computed(
  () => unifiedTimeline.value.length > 0
);

// Settings signals
export const issueCreationSettings = signal<IssueCreationSettings>({
  ...DEFAULT_ISSUE_CREATION_SETTINGS,
});

export const githubOAuthState = signal<GitHubOAuthState>({});

export const oauthRepositories = signal<GitHubOAuthRepository[]>([]);
export const isLoadingOAuthRepos = signal<boolean>(false);

// Active tab in sidepanel
export type SidepanelTab = "main" | "settings";
export const activeSidepanelTab = signal<SidepanelTab>("main");

// Computed: can create issue based on current mode
export const canCreateIssueWithCurrentMode = computed(() => {
  const method = issueCreationSettings.value.createMethod;
  const customApi = issueCreationSettings.value.customApi;

  // Custom API only mode は常に有効
  if (customApi.enabled && customApi.skipBuiltinCreate) {
    return true;
  }

  switch (method) {
    case "copy":
      return true;
    case "github-api":
      return Boolean(githubOAuthState.value.accessToken && githubOAuthState.value.selectedRepo);
    case "gh-cli":
      return Boolean(
        currentHelper.value.reachable &&
        currentHelper.value.github?.gh_installed &&
        currentHelper.value.github?.authenticated
      );
    default:
      return false;
  }
});

// Computed: 現在のモードでセットアップが必要かどうか
export const needsSetup = computed(() => {
  const method = issueCreationSettings.value.createMethod;
  const customApi = issueCreationSettings.value.customApi;

  // Custom API only mode はセットアップ不要
  if (customApi.enabled && customApi.skipBuiltinCreate) {
    return false;
  }

  switch (method) {
    case "copy":
      return false;
    case "github-api":
      return !githubOAuthState.value.accessToken;
    case "gh-cli": {
      const helper = currentHelper.value;
      return !helper.reachable || !helper.github?.gh_installed || !helper.github?.authenticated;
    }
    default:
      return false;
  }
});

// Computed: セットアップが必要な理由
export type SetupRequirement =
  | { type: "github-api-not-connected" }
  | { type: "helper-not-reachable" }
  | { type: "helper-not-authenticated" }
  | { type: "helper-gh-not-installed" }
  | { type: "helper-gh-not-authenticated" }
  | null;

export const setupRequirement = computed<SetupRequirement>(() => {
  const method = issueCreationSettings.value.createMethod;
  const customApi = issueCreationSettings.value.customApi;

  if (customApi.enabled && customApi.skipBuiltinCreate) {
    return null;
  }

  switch (method) {
    case "github-api":
      if (!githubOAuthState.value.accessToken) {
        return { type: "github-api-not-connected" };
      }
      return null;
    case "gh-cli": {
      const helper = currentHelper.value;
      if (!helper.reachable) {
        return { type: "helper-not-reachable" };
      }
      // Check if extension is authenticated with helper
      if (!helperAuthState.value.authenticated) {
        return { type: "helper-not-authenticated" };
      }
      if (!helper.github?.gh_installed) {
        return { type: "helper-gh-not-installed" };
      }
      if (!helper.github?.authenticated) {
        return { type: "helper-gh-not-authenticated" };
      }
      return null;
    }
    default:
      return null;
  }
});
