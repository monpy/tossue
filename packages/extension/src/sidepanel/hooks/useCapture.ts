import { useEffect } from "preact/hooks";
import type { CaptureRect, Message, MediaItem } from "../../shared/types";
import {
  activeTabId,
  currentState,
  pendingCaptureId,
  selectAreaButtonText,
  captureButtonText,
  recordingButtonText,
  isSelectingArea,
  isCapturing,
  recordingState,
  selectAreaStatus,
  captureImageStatus,
  recordingStatus,
} from "../store/signals";
import { cropSelectedArea } from "../utils/image";

async function stopRecordingIfActive(): Promise<void> {
  const state = recordingState.value;
  if (state.recorder && state.recorder.state !== "inactive") {
    try {
      await chrome.runtime.sendMessage({
        type: "STOP_TAB_RECORDING",
        tabId: activeTabId.value,
      });
    } catch {}
    state.recorder.stop();
    recordingButtonText.value = "Start Recording";
    recordingStatus.value = "";
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCapture() {
  useEffect(() => {
    maybeProcessCaptureRect();
  }, [currentState.value.captureRect]);

  useEffect(() => {
    const handleMessage = (
      message: Message,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ) => {
      if (message.type !== "PICKER_CANCELLED") {
        return;
      }
      // tabId が一致するか、または tabId が指定されていない場合は処理する
      if (message.tabId !== undefined && message.tabId !== activeTabId.value) {
        return;
      }
      const payload = message.payload as { mode: string } | undefined;
      const mode = payload?.mode;
      if (mode === "area") {
        selectAreaButtonText.value = currentState.value.selectedArea ? "Select Again" : "Select Area";
        isSelectingArea.value = false;
        selectAreaStatus.value = "";
      } else if (mode === "capture") {
        captureButtonText.value = "Start Capture";
        isCapturing.value = false;
        captureImageStatus.value = "";
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
  // Toggle: if already selecting, cancel it
  if (isSelectingArea.value) {
    await chrome.runtime.sendMessage({
      type: "STOP_PICKER",
      tabId: activeTabId.value,
    });
    selectAreaButtonText.value = currentState.value.selectedArea ? "Select Again" : "Select Area";
    isSelectingArea.value = false;
    selectAreaStatus.value = "";
    return;
  }

  // If capturing is active, stop it first
  if (isCapturing.value) {
    await chrome.runtime.sendMessage({
      type: "STOP_PICKER",
      tabId: activeTabId.value,
    });
    captureButtonText.value = "Start Capture";
    isCapturing.value = false;
    captureImageStatus.value = "";
  }

  // Stop recording if active
  await stopRecordingIfActive();

  await chrome.runtime.sendMessage({
    type: "START_AREA_PICKER",
    tabId: activeTabId.value,
  });

  selectAreaStatus.value = "Click an element on the page to select it.";
  selectAreaButtonText.value = "Selecting...";
  isSelectingArea.value = true;
}

export async function startCaptureMode(): Promise<void> {
  // Toggle: if already capturing, cancel it
  if (isCapturing.value) {
    await chrome.runtime.sendMessage({
      type: "STOP_PICKER",
      tabId: activeTabId.value,
    });
    captureButtonText.value = "Start Capture";
    isCapturing.value = false;
    captureImageStatus.value = "";
    return;
  }

  // If selecting is active, stop it first
  if (isSelectingArea.value) {
    await chrome.runtime.sendMessage({
      type: "STOP_PICKER",
      tabId: activeTabId.value,
    });
    selectAreaButtonText.value = currentState.value.selectedArea ? "Select Again" : "Select Area";
    isSelectingArea.value = false;
    selectAreaStatus.value = "";
  }

  // Stop recording if active
  await stopRecordingIfActive();

  await chrome.runtime.sendMessage({
    type: "START_CAPTURE_PICKER",
    tabId: activeTabId.value,
  });

  captureImageStatus.value = "Drag on the page to capture a rectangle.";
  captureButtonText.value = "Capturing...";
  isCapturing.value = true;
}

export async function captureScreenshot(rectSelection?: CaptureRect): Promise<void> {
  const selection = rectSelection || currentState.value.captureRect;
  if (!selection?.rect) {
    captureImageStatus.value = "Start Capture を押して、ページ上で保存したい範囲をドラッグしてください。";
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "CAPTURE_SCREENSHOT",
    tabId: activeTabId.value,
  });

  if (!response.ok) {
    captureImageStatus.value = response.error;
    return;
  }

  const croppedScreenshot = await cropSelectedArea(response.screenshotDataUrl, selection);
  const newItem: MediaItem = {
    id: generateId(),
    type: "image",
    dataUrl: croppedScreenshot,
    capturedAt: Date.now(),
  };
  // Read current state when updating to avoid stale closure
  const latestState = currentState.value;
  currentState.value = {
    ...latestState,
    screenshots: [...(latestState.screenshots || []), newItem],
  };
  captureImageStatus.value = "";
  captureButtonText.value = "Start Capture";
  isCapturing.value = false;
}

export function removeScreenshot(id: string): void {
  const state = currentState.value;
  currentState.value = {
    ...state,
    screenshots: (state.screenshots || []).filter((item) => item.id !== id),
  };
  captureImageStatus.value = "";
}

function maybeProcessCaptureRect(): void {
  const state = currentState.value;
  const captureRect = state.captureRect;
  if (!captureRect?.capturedAt || captureRect.capturedAt === pendingCaptureId.value) {
    return;
  }

  pendingCaptureId.value = captureRect.capturedAt;
  captureScreenshot(captureRect).catch((error) => {
    captureImageStatus.value = (error as Error).message;
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
