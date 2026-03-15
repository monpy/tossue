import { useEffect } from "preact/hooks";
import type { CaptureRect, Message, MediaItem } from "../../shared/types";
import {
  activeTabId,
  currentState,
  captureStatusMessage,
  pendingCaptureId,
  selectAreaButtonText,
  captureButtonText,
  isSelectingArea,
  isCapturing,
} from "../store/signals";
import { cropSelectedArea } from "../utils/image";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCapture() {
  useEffect(() => {
    maybeProcessCaptureRect();
  }, [currentState.value.captureRect]);

  useEffect(() => {
    const handleMessage = (message: Message) => {
      if (message.type === "PICKER_CANCELLED" && message.tabId === activeTabId.value) {
        const { mode } = message.payload as { mode: string };
        if (mode === "area") {
          selectAreaButtonText.value = currentState.value.selectedArea ? "Select Again" : "Select Area";
          isSelectingArea.value = false;
        } else if (mode === "capture") {
          captureButtonText.value = "Start Capture";
          isCapturing.value = false;
        }
        captureStatusMessage.value = "Cancelled.";
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return {
    startAreaPicker,
    startCaptureMode,
    removeScreenshot,
  };
}

export async function startAreaPicker(): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "START_AREA_PICKER",
    tabId: activeTabId.value,
  });

  captureStatusMessage.value = "Area picker started. Click an element on the page to select it.";
  selectAreaButtonText.value = "Selecting...";
  isSelectingArea.value = true;
}

export async function startCaptureMode(): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "START_CAPTURE_PICKER",
    tabId: activeTabId.value,
  });

  captureStatusMessage.value = "Capture mode started. Drag on the page to capture a rectangle.";
  captureButtonText.value = "Capturing...";
  isCapturing.value = true;
}

export async function captureScreenshot(rectSelection?: CaptureRect): Promise<void> {
  const state = currentState.value;
  const selection = rectSelection || state.captureRect;
  if (!selection?.rect) {
    captureStatusMessage.value = "Start Capture を押して、ページ上で保存したい範囲をドラッグしてください。";
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "CAPTURE_SCREENSHOT",
    tabId: activeTabId.value,
  });

  if (!response.ok) {
    captureStatusMessage.value = response.error;
    return;
  }

  const croppedScreenshot = await cropSelectedArea(response.screenshotDataUrl, selection);
  const newItem: MediaItem = {
    id: generateId(),
    type: "image",
    dataUrl: croppedScreenshot,
    capturedAt: Date.now(),
  };
  currentState.value = {
    ...state,
    screenshots: [...(state.screenshots || []), newItem],
  };
  captureStatusMessage.value = "Captured image saved in the panel preview.";
  captureButtonText.value = "Start Capture";
  isCapturing.value = false;
}

export function removeScreenshot(id: string): void {
  const state = currentState.value;
  currentState.value = {
    ...state,
    screenshots: (state.screenshots || []).filter((item) => item.id !== id),
  };
  captureStatusMessage.value = "Captured image removed.";
}

function maybeProcessCaptureRect(): void {
  const state = currentState.value;
  const captureRect = state.captureRect;
  if (!captureRect?.capturedAt || captureRect.capturedAt === pendingCaptureId.value) {
    return;
  }

  pendingCaptureId.value = captureRect.capturedAt;
  captureScreenshot(captureRect).catch((error) => {
    captureStatusMessage.value = (error as Error).message;
    captureButtonText.value = "Start Capture";
  });
}

export async function highlightArea(payload: unknown): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: "HIGHLIGHT_SELECTED_AREA",
      tabId: activeTabId.value,
      payload,
    });
  } catch {}
}

export async function clearHighlight(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: "CLEAR_SELECTED_AREA_HIGHLIGHT",
      tabId: activeTabId.value,
    });
  } catch {}
}
