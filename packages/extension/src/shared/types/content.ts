import type { SelectedArea, Rect, Viewport, FrameworkInfo } from "./state";

export type OverlayState = {
  active: boolean;
  mode: "area" | "capture" | "";
  hoveredElement: Element | null;
  outline: HTMLDivElement | null;
  captureBox: HTMLDivElement | null;
  previewOutline: HTMLDivElement | null;
  toast: HTMLDivElement | null;
  dragStart: { x: number; y: number } | null;
};

export type ActionEntry = {
  type: string;
  at: string;
  target: string;
  valueSnippet: string;
  targetInfo: SelectedArea | null;
  href?: string;
  navigationKind?: string;
};

export type ContentMessage = {
  type:
    | "START_AREA_PICKER"
    | "START_CAPTURE_PICKER"
    | "HIGHLIGHT_SELECTED_AREA"
    | "CLEAR_SELECTED_AREA_HIGHLIGHT"
    | "AREA_SELECTED"
    | "CAPTURE_RECT_SELECTED"
    | "PICKER_CANCELLED"
    | "ACTION_LOGGED"
    | "CONSOLE_EVENT"
    | "NETWORK_EVENT";
  payload?: unknown;
};
