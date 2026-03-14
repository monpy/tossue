import type {
  TabState,
  UserAction,
  ConsoleEntry,
  NetworkEntry,
  IssueDraft,
  Message,
  MessageResponse,
  DevtoolsEventPayload,
} from "../shared/types";

const MAX_ACTIONS = 25;
const MAX_CONSOLE = 20;
const MAX_REQUESTS = 20;
const STORAGE_KEYS = {
  defaultRepo: "defaultRepo",
};

const tabState = new Map<number, TabState>();
const screencastSessions = new Map<number, { attachedAt: number }>();
let nextActionId = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.debugger.onEvent.addListener(handleDebuggerEvent);
chrome.debugger.onDetach.addListener(handleDebuggerDetach);

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<Partial<MessageResponse>> {
  const tabId = message.tabId ?? sender.tab?.id;

  switch (message.type) {
    case "GET_ACTIVE_TAB_STATE":
      return { state: await getState(tabId) };
    case "START_AREA_PICKER":
      await sendTabMessage(tabId, { type: "START_AREA_PICKER" });
      return { started: true };
    case "START_CAPTURE_PICKER":
      await sendTabMessage(tabId, { type: "START_CAPTURE_PICKER" });
      return { started: true };
    case "HIGHLIGHT_SELECTED_AREA":
      await sendTabMessage(tabId, {
        type: "HIGHLIGHT_SELECTED_AREA",
        payload: message.payload,
      });
      return { highlighted: true };
    case "CLEAR_SELECTED_AREA_HIGHLIGHT":
      await sendTabMessage(tabId, { type: "CLEAR_SELECTED_AREA_HIGHLIGHT" });
      return { cleared: true };
    case "AREA_SELECTED":
      updateState(tabId, { selectedArea: message.payload as TabState["selectedArea"] });
      return await respondWithState(tabId);
    case "CAPTURE_RECT_SELECTED":
      updateState(tabId, { captureRect: message.payload as TabState["captureRect"] });
      return await respondWithState(tabId);
    case "CLEAR_SCREENSHOT":
      updateState(tabId, { captureRect: null, screenshotDataUrl: "" });
      return await respondWithState(tabId);
    case "ACTION_LOGGED":
      appendAction(tabId, message.payload as Partial<UserAction>);
      return await respondWithState(tabId);
    case "CLEAR_ACTIONS":
      mutateActions(tabId, () => []);
      return await respondWithState(tabId);
    case "DELETE_ACTION":
      mutateActions(tabId, (actions) =>
        actions.filter((action) => action.id !== (message.payload as { id: string })?.id)
      );
      return await respondWithState(tabId);
    case "TRIM_ACTIONS_BEFORE":
      mutateActions(tabId, (actions) =>
        trimActionsBefore(actions, (message.payload as { id: string })?.id)
      );
      return await respondWithState(tabId);
    case "UNDO_ACTION_EDIT":
      undoActionEdit(tabId);
      return await respondWithState(tabId);
    case "REDO_ACTION_EDIT":
      redoActionEdit(tabId);
      return await respondWithState(tabId);
    case "CONSOLE_EVENT":
      pushItem(tabId, "consoleEntries", message.payload as ConsoleEntry, MAX_CONSOLE);
      return await respondWithState(tabId);
    case "NETWORK_EVENT":
      pushItem(tabId, "networkEntries", message.payload as NetworkEntry, MAX_REQUESTS);
      return await respondWithState(tabId);
    case "STORE_FORM":
      await persistDefaultRepo((message.payload as IssueDraft)?.repo);
      updateState(tabId, { draft: message.payload as IssueDraft });
      return await respondWithState(tabId);
    case "CAPTURE_SCREENSHOT":
      return { screenshotDataUrl: await captureScreenshot(tabId, sender.tab) };
    case "START_TAB_RECORDING":
      return await startTabRecording(tabId);
    case "STOP_TAB_RECORDING":
      return await stopTabRecording(tabId);
    case "DEVTOOLS_EVENT":
      ingestDevtoolsEvent(tabId, message.payload as DevtoolsEventPayload);
      return await respondWithState(tabId);
    default:
      throw new Error(`Unsupported message type: ${message.type}`);
  }
}

async function getState(tabId: number | undefined): Promise<TabState> {
  const baseState = getOrCreateState(tabId);
  const defaultRepo = await readDefaultRepo();

  if (defaultRepo && !baseState.draft.repo) {
    const nextState: TabState = {
      ...baseState,
      draft: {
        ...baseState.draft,
        repo: defaultRepo,
      },
    };
    if (tabId) {
      tabState.set(tabId, nextState);
    }
    return nextState;
  }

  return baseState;
}

function getOrCreateState(tabId: number | undefined): TabState {
  if (!tabId) {
    return createEmptyState();
  }

  if (!tabState.has(tabId)) {
    tabState.set(tabId, createEmptyState());
  }

  return tabState.get(tabId)!;
}

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

function updateState(tabId: number | undefined, patch: Partial<TabState>): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  tabState.set(tabId, { ...current, ...patch });
}

function pushItem<K extends "consoleEntries" | "networkEntries">(
  tabId: number | undefined,
  key: K,
  item: TabState[K][number],
  limit: number
): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  const items = [...current[key], item].slice(-limit) as TabState[K];
  tabState.set(tabId, { ...current, [key]: items });
}

function appendAction(tabId: number | undefined, item: Partial<UserAction>): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  const action: UserAction = {
    id: item?.id || `action-${nextActionId++}`,
    kind: item?.type === "navigation" ? "navigation" : (item?.kind as UserAction["kind"]) || "event",
    type: item?.type || "",
    at: item?.at || new Date().toISOString(),
    target: item?.target || "",
    valueSnippet: item?.valueSnippet || "",
    targetInfo: item?.targetInfo || null,
    href: item?.href,
    navigationKind: item?.navigationKind,
  };
  const actions = [...current.actions, action].slice(-MAX_ACTIONS);
  tabState.set(tabId, {
    ...current,
    actions,
  });
}

function mutateActions(
  tabId: number | undefined,
  transform: (actions: UserAction[]) => UserAction[]
): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  const previousActions = current.actions.map(cloneAction);
  const nextActions = transform(previousActions.map(cloneAction)).slice(-MAX_ACTIONS);

  tabState.set(tabId, {
    ...current,
    actions: nextActions,
    actionHistoryPast: [...current.actionHistoryPast, previousActions].slice(-20),
    actionHistoryFuture: [],
  });
}

function undoActionEdit(tabId: number | undefined): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  const previous = current.actionHistoryPast.at(-1);
  if (!previous) {
    return;
  }

  tabState.set(tabId, {
    ...current,
    actions: previous.map(cloneAction),
    actionHistoryPast: current.actionHistoryPast.slice(0, -1),
    actionHistoryFuture: [current.actions.map(cloneAction), ...current.actionHistoryFuture].slice(
      0,
      20
    ),
  });
}

function redoActionEdit(tabId: number | undefined): void {
  if (!tabId) return;
  const current = getOrCreateState(tabId);
  const next = current.actionHistoryFuture[0];
  if (!next) {
    return;
  }

  tabState.set(tabId, {
    ...current,
    actions: next.map(cloneAction),
    actionHistoryPast: [...current.actionHistoryPast, current.actions.map(cloneAction)].slice(-20),
    actionHistoryFuture: current.actionHistoryFuture.slice(1),
  });
}

function cloneAction(action: UserAction): UserAction {
  return structuredClone(action);
}

function trimActionsBefore(actions: UserAction[], id: string | undefined): UserAction[] {
  if (!id) return actions;
  const index = actions.findIndex((action) => action.id === id);
  if (index < 0) {
    return actions;
  }

  if (index === 0) {
    return actions;
  }

  return actions.filter((_action, actionIndex) => actionIndex >= index);
}

function ingestDevtoolsEvent(
  tabId: number | undefined,
  payload: DevtoolsEventPayload | undefined
): void {
  if (!tabId || !payload) {
    return;
  }

  if (payload.kind === "console") {
    pushItem(tabId, "consoleEntries", payload.entry as ConsoleEntry, MAX_CONSOLE);
  }

  if (payload.kind === "network") {
    pushItem(tabId, "networkEntries", payload.entry as NetworkEntry, MAX_REQUESTS);
  }
}

async function captureScreenshot(
  tabId: number | undefined,
  senderTab: chrome.tabs.Tab | undefined
): Promise<string> {
  let targetTab = senderTab;

  if (!targetTab && tabId) {
    targetTab = await chrome.tabs.get(tabId);
  }

  if (!targetTab?.windowId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTab = activeTab || targetTab;
  }

  if (!targetTab?.windowId) {
    throw new Error("Unable to resolve the active window for screenshot capture.");
  }

  assertCapturableTab(targetTab);

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId, {
    format: "png",
  });

  if (tabId) {
    updateState(tabId, { screenshotDataUrl });
  }
  return screenshotDataUrl;
}

async function sendTabMessage(
  tabId: number | undefined,
  message: Partial<Message>
): Promise<unknown> {
  if (!tabId) {
    throw new Error("Unable to resolve the active tab.");
  }

  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!shouldRetryContentScript(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    return await chrome.tabs.sendMessage(tabId, message);
  }
}

function shouldRetryContentScript(error: unknown): boolean {
  const message = String((error as Error)?.message || "");
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection") ||
    message.includes("The message port closed before a response was received")
  );
}

async function startTabRecording(
  tabId: number | undefined
): Promise<{ started: boolean; alreadyRunning?: boolean }> {
  if (!tabId) {
    throw new Error("Unable to resolve the active tab for recording.");
  }

  const tab = await chrome.tabs.get(tabId);
  assertCapturableTab(tab);

  if (screencastSessions.has(tabId)) {
    return { started: true, alreadyRunning: true };
  }

  const target = { tabId };

  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (error) {
    if (!String((error as Error)?.message || "").includes("Another debugger is already attached")) {
      throw error;
    }
  }

  try {
    await chrome.debugger.sendCommand(target, "Page.enable");
    await chrome.debugger.sendCommand(target, "Page.startScreencast", {
      format: "jpeg",
      quality: 80,
      everyNthFrame: 1,
    });
  } catch (error) {
    try {
      await chrome.debugger.detach(target);
    } catch (_detachError) {}
    throw error;
  }

  screencastSessions.set(tabId, {
    attachedAt: Date.now(),
  });

  return { started: true };
}

async function stopTabRecording(
  tabId: number | undefined
): Promise<{ stopped: boolean }> {
  if (!tabId) {
    return { stopped: true };
  }

  const target = { tabId };
  if (!screencastSessions.has(tabId)) {
    return { stopped: true };
  }

  screencastSessions.delete(tabId);

  try {
    await chrome.debugger.sendCommand(target, "Page.stopScreencast");
  } catch (_error) {}

  try {
    await chrome.debugger.detach(target);
  } catch (_error) {}

  chrome.runtime
    .sendMessage({
      type: "TAB_RECORDING_STOPPED",
      tabId,
    })
    .catch(() => {});

  return { stopped: true };
}

function assertCapturableTab(tab: chrome.tabs.Tab): void {
  const url = String(tab?.url || "");
  if (!url) {
    return;
  }

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  ) {
    throw new Error(
      "Chrome internal pages cannot be captured. Open a normal website tab and try again."
    );
  }
}

async function handleDebuggerEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params?: { data?: string; metadata?: object; sessionId?: number }
): Promise<void> {
  if (method !== "Page.screencastFrame" || !source.tabId) {
    return;
  }

  const session = screencastSessions.get(source.tabId);
  if (!session) {
    return;
  }

  chrome.runtime
    .sendMessage({
      type: "TAB_RECORDING_FRAME",
      tabId: source.tabId,
      data: params?.data,
      metadata: params?.metadata || {},
    })
    .catch(() => {});

  try {
    await chrome.debugger.sendCommand({ tabId: source.tabId }, "Page.screencastFrameAck", {
      sessionId: params?.sessionId,
    });
  } catch (_error) {}
}

function handleDebuggerDetach(source: chrome.debugger.Debuggee): void {
  if (!source.tabId) {
    return;
  }

  if (!screencastSessions.has(source.tabId)) {
    return;
  }

  screencastSessions.delete(source.tabId);
  chrome.runtime
    .sendMessage({
      type: "TAB_RECORDING_STOPPED",
      tabId: source.tabId,
    })
    .catch(() => {});
}

async function respondWithState(
  tabId: number | undefined
): Promise<{ state: TabState }> {
  const state = await getState(tabId);
  broadcastState(tabId, state);
  return { state };
}

function broadcastState(tabId: number | undefined, state: TabState): void {
  chrome.runtime
    .sendMessage({
      type: "STATE_UPDATED",
      tabId,
      state,
    })
    .catch(() => {});
}

async function readDefaultRepo(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.defaultRepo);
  return String(stored[STORAGE_KEYS.defaultRepo] || "").trim();
}

async function persistDefaultRepo(repo: string | undefined): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.defaultRepo]: String(repo || "").trim(),
  });
}
