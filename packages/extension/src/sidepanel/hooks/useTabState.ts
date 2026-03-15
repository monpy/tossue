import { useEffect } from "preact/hooks";
import {
  activeTabId,
  currentState,
  labelPresets,
  selectedLabels,
  issueOptions,
  selectAreaButtonText,
  captureButtonText,
  isSelectingArea,
  isCapturing,
  DEFAULT_LABEL_PRESETS,
} from "../store/signals";
import { refreshHelperState } from "./useHelper";
import type { TabState, Message } from "../../shared/types";

const LABEL_STORAGE_KEY = "labelPresets";
const ISSUE_OPTIONS_STORAGE_KEY = "issueOptions";

export function useTabState() {
  useEffect(() => {
    bootstrap();

    const handleMessage = (message: Message) => {
      if (message.type === "STATE_UPDATED" && message.tabId === activeTabId.value) {
        const nextState = message.state as TabState;
        const prevArea = currentState.value.selectedArea;
        const shouldHydrate = !draftsEqual(currentState.value.draft, nextState?.draft);
        currentState.value = nextState;
        if (shouldHydrate) {
          hydrateLabels(nextState.draft?.labels || []);
        }
        // Reset active states when area selection completes
        if (nextState.selectedArea !== prevArea) {
          selectAreaButtonText.value = nextState.selectedArea ? "Select Again" : "Select Area";
          isSelectingArea.value = false;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return {
    refreshState,
    persistDraft,
  };
}

async function bootstrap() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId.value = tab?.id ?? null;
  await Promise.all([loadLabelPresets(), loadIssueOptions()]);
  await Promise.all([refreshState(), refreshHelperState()]);
}

export async function refreshState() {
  const response = await chrome.runtime.sendMessage({
    type: "GET_ACTIVE_TAB_STATE",
    tabId: activeTabId.value,
  });

  if (!response.ok) {
    throw new Error(response.error);
  }

  currentState.value = response.state;
  hydrateLabels(response.state.draft?.labels || []);

  // Update button texts based on state
  const area = response.state.selectedArea;
  selectAreaButtonText.value = area ? "Select Again" : "Select Area";
  captureButtonText.value = "Start Capture";
}

export async function persistDraft() {
  const draft = {
    repo: currentState.value.draft.repo,
    summary: currentState.value.draft.summary,
    currentBehavior: currentState.value.draft.currentBehavior,
    expectedBehavior: currentState.value.draft.expectedBehavior,
    labels: Array.from(selectedLabels.value),
  };

  await chrome.runtime.sendMessage({
    type: "STORE_FORM",
    tabId: activeTabId.value,
    payload: draft,
  });

  currentState.value = { ...currentState.value, draft };
}

function draftsEqual(
  left: TabState["draft"] | undefined,
  right: TabState["draft"] | undefined
): boolean {
  const normalize = (draft: TabState["draft"] | undefined) =>
    JSON.stringify({
      repo: draft?.repo || "",
      summary: draft?.summary || "",
      currentBehavior: draft?.currentBehavior || "",
      expectedBehavior: draft?.expectedBehavior || "",
      labels: Array.isArray(draft?.labels) ? [...draft.labels].sort() : [],
    });

  return normalize(left) === normalize(right);
}

async function loadLabelPresets() {
  const stored = await chrome.storage.local.get(LABEL_STORAGE_KEY);
  const saved = Array.isArray(stored[LABEL_STORAGE_KEY]) ? stored[LABEL_STORAGE_KEY] : [];
  labelPresets.value = Array.from(new Set([...DEFAULT_LABEL_PRESETS, ...saved.filter(Boolean)]));
}

async function loadIssueOptions() {
  const stored = await chrome.storage.local.get(ISSUE_OPTIONS_STORAGE_KEY);
  const saved = stored[ISSUE_OPTIONS_STORAGE_KEY];
  issueOptions.value = {
    includeActions: saved?.includeActions !== false,
  };
}

function hydrateLabels(labelsValue: string[] | string) {
  const labels = Array.isArray(labelsValue)
    ? labelsValue
    : String(labelsValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  for (const label of labels) {
    if (!labelPresets.value.includes(label)) {
      labelPresets.value = [...labelPresets.value, label];
    }
  }

  selectedLabels.value = new Set(labels);
}

export async function saveLabelPresets() {
  await chrome.storage.local.set({
    [LABEL_STORAGE_KEY]: labelPresets.value,
  });
}

export async function saveIssueOptions() {
  await chrome.storage.local.set({
    [ISSUE_OPTIONS_STORAGE_KEY]: issueOptions.value,
  });
}
