import {
  activeTabId,
  currentState,
  statusMessage,
  issueOptions,
} from "../store/signals";

const ISSUE_OPTIONS_STORAGE_KEY = "issueOptions";

export function useActions() {
  return {
    clearActions,
    undoActions,
    redoActions,
    deleteAction,
    deleteTimelineEntry,
    trimTimelineBefore,
    handleIssueOptionsChange,
  };
}

export async function clearActions(): Promise<void> {
  await mutateActionTimeline("CLEAR_ACTIONS");
}

export async function undoActions(): Promise<void> {
  await mutateActionTimeline("UNDO_ACTION_EDIT");
}

export async function redoActions(): Promise<void> {
  await mutateActionTimeline("REDO_ACTION_EDIT");
}

export async function deleteAction(id: string): Promise<void> {
  await mutateActionTimeline("DELETE_ACTION", { id });
}

export async function deleteTimelineEntry(id: string, kind: string): Promise<void> {
  await mutateActionTimeline("DELETE_TIMELINE_ENTRY", { id, kind });
}

export async function trimTimelineBefore(id: string, kind: string, at: string): Promise<void> {
  await mutateActionTimeline("TRIM_TIMELINE_BEFORE", { id, kind, at });
}

async function mutateActionTimeline(type: string, payload?: unknown): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type,
    tabId: activeTabId.value,
    payload,
  });

  if (!response.ok) {
    statusMessage.value = response.error;
    return;
  }

  currentState.value = response.state;
}

export async function handleIssueOptionsChange(includeActions: boolean): Promise<void> {
  issueOptions.value = { includeActions };
  await chrome.storage.local.set({
    [ISSUE_OPTIONS_STORAGE_KEY]: issueOptions.value,
  });
}
