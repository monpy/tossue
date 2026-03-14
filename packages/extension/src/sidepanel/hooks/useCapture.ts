import { useEffect } from "preact/hooks";
import type { CaptureRect } from "../../shared/types";
import {
  activeTabId,
  currentState,
  captureStatusMessage,
  pendingCaptureId,
  selectAreaButtonText,
  captureButtonText,
} from "../store/signals";
import { cropSelectedArea } from "../utils/image";

export function useCapture() {
  useEffect(() => {
    maybeProcessCaptureRect();
  }, [currentState.value.captureRect]);

  return {
    startAreaPicker,
    startCaptureMode,
    clearScreenshotPreview,
  };
}

export async function startAreaPicker(): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "START_AREA_PICKER",
    tabId: activeTabId.value,
  });

  captureStatusMessage.value = "Area picker started. Click an element on the page to select it.";
  selectAreaButtonText.value = "Selecting...";
}

export async function startCaptureMode(): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "START_CAPTURE_PICKER",
    tabId: activeTabId.value,
  });

  captureStatusMessage.value = "Capture mode started. Drag on the page to capture a rectangle.";
  captureButtonText.value = "Capturing...";
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
  currentState.value = { ...state, screenshotDataUrl: croppedScreenshot };
  captureStatusMessage.value = "Captured image saved in the panel preview.";
  captureButtonText.value = "Start Capture";
}

export async function clearScreenshotPreview(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "CLEAR_SCREENSHOT",
    tabId: activeTabId.value,
  });

  if (!response.ok) {
    captureStatusMessage.value = response.error;
    return;
  }

  currentState.value = response.state;
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
