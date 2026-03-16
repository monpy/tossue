import type {
  TabState,
  SelectedArea,
  CaptureRect,
  UserAction,
  ConsoleEntry,
  NetworkEntry,
  IssueDraft,
} from "./state";

export type MessageType =
  | "GET_ACTIVE_TAB_STATE"
  | "START_AREA_PICKER"
  | "START_CAPTURE_PICKER"
  | "STOP_PICKER"
  | "HIGHLIGHT_SELECTED_AREA"
  | "CLEAR_SELECTED_AREA_HIGHLIGHT"
  | "AREA_SELECTED"
  | "CAPTURE_RECT_SELECTED"
  | "PICKER_CANCELLED"
  | "CLEAR_SCREENSHOT"
  | "ACTION_LOGGED"
  | "CLEAR_ACTIONS"
  | "DELETE_ACTION"
  | "DELETE_TIMELINE_ENTRY"
  | "TRIM_ACTIONS_BEFORE"
  | "TRIM_TIMELINE_BEFORE"
  | "UNDO_ACTION_EDIT"
  | "REDO_ACTION_EDIT"
  | "CONSOLE_EVENT"
  | "NETWORK_EVENT"
  | "STORE_FORM"
  | "CAPTURE_SCREENSHOT"
  | "START_TAB_RECORDING"
  | "STOP_TAB_RECORDING"
  | "DEVTOOLS_EVENT"
  | "STATE_UPDATED"
  | "TAB_RECORDING_FRAME"
  | "TAB_RECORDING_STOPPED"
  | "DEVTOOLS_STATUS_UPDATE"
  | "GET_DEVTOOLS_STATUS"
  | "RESET_STATE";

export type Message = {
  type: MessageType;
  tabId?: number;
  payload?: unknown;
  state?: TabState;
  data?: string;
  metadata?: {
    deviceWidth?: number;
    deviceHeight?: number;
  };
};

export type DevtoolsEventPayload = {
  kind: "console" | "network";
  entry: ConsoleEntry | NetworkEntry;
};

export type DevtoolsStatus = {
  panelOpen: boolean;
  debuggerAttached: boolean;
};

export type MessageResponse = {
  ok: boolean;
  error?: string;
  state?: TabState;
  started?: boolean;
  stopped?: boolean;
  alreadyRunning?: boolean;
  highlighted?: boolean;
  cleared?: boolean;
  screenshotDataUrl?: string;
  devtoolsStatus?: DevtoolsStatus;
};
