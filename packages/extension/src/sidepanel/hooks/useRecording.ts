import { useEffect } from "preact/hooks";
import {
  activeTabId,
  recordingState,
  captureStatusMessage,
  recordingButtonText,
} from "../store/signals";
import { decodeFrame } from "../utils/image";

export function useRecording() {
  useEffect(() => {
    const handleMessage = (message: { type: string; tabId: number; data?: string; metadata?: { deviceWidth: number; deviceHeight: number } }) => {
      if (message.type === "TAB_RECORDING_FRAME" && message.tabId === activeTabId.value) {
        drawRecordingFrame(message.data || "", message.metadata);
        return;
      }

      if (message.type === "TAB_RECORDING_STOPPED" && message.tabId === activeTabId.value) {
        const state = recordingState.value;
        if (state.recorder && state.recorder.state !== "inactive") {
          state.recorder.stop();
        }
        recordingButtonText.value = "Start Recording";
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return {
    toggleRecording,
    clearRecordingPreview,
  };
}

export async function toggleRecording(): Promise<void> {
  const state = recordingState.value;
  if (state.recorder && state.recorder.state !== "inactive") {
    await stopDebuggerRecording();
    state.recorder.stop();
    recordingButtonText.value = "Start Recording";
    captureStatusMessage.value = "Stopping recording...";
    return;
  }

  try {
    const startResponse = await chrome.runtime.sendMessage({
      type: "START_TAB_RECORDING",
      tabId: activeTabId.value,
    });
    if (!startResponse?.ok) {
      throw new Error(startResponse?.error || "Failed to start current-tab recording.");
    }

    const { canvas, stream } = createRecordingCanvasStream();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recordingState.value = {
      stream,
      recorder,
      chunks,
      objectUrl: state.objectUrl,
      canvas,
      context: canvas.getContext("2d"),
      framePending: Promise.resolve(),
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        recordingState.value.chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      finalizeRecording();
    });

    recorder.start();
    recordingButtonText.value = "Stop Recording";
    captureStatusMessage.value = "Current tab recording started.";
  } catch (error) {
    captureStatusMessage.value = (error as Error).message;
  }
}

export function clearRecordingPreview(): void {
  const state = recordingState.value;
  if (state.recorder && state.recorder.state !== "inactive") {
    return;
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  recordingState.value = {
    ...state,
    objectUrl: "",
    chunks: [],
  };
  captureStatusMessage.value = "Recorded preview removed.";
}

function createRecordingCanvasStream(): { canvas: HTMLCanvasElement; stream: MediaStream } {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#111";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const stream = canvas.captureStream(10);
  return { canvas, stream };
}

function drawRecordingFrame(base64Data: string, metadata?: { deviceWidth: number; deviceHeight: number }): void {
  const state = recordingState.value;
  if (!state.canvas || !state.context) {
    return;
  }

  recordingState.value = {
    ...state,
    framePending: state.framePending
      .then(async () => {
        const bitmap = await decodeFrame(base64Data);
        const width = Math.max(1, metadata?.deviceWidth || bitmap.width);
        const height = Math.max(1, metadata?.deviceHeight || bitmap.height);

        if (state.canvas!.width !== width || state.canvas!.height !== height) {
          state.canvas!.width = width;
          state.canvas!.height = height;
        }

        state.context!.clearRect(0, 0, width, height);
        state.context!.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
      })
      .catch(() => {}),
  };
}

function finalizeRecording(): void {
  const state = recordingState.value;
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  const blob = new Blob(state.chunks, {
    type: state.recorder?.mimeType || "video/webm",
  });
  const objectUrl = URL.createObjectURL(blob);

  for (const track of state.stream?.getTracks() || []) {
    track.stop();
  }

  recordingState.value = {
    stream: null,
    recorder: null,
    chunks: [],
    objectUrl,
    canvas: null,
    context: null,
    framePending: Promise.resolve(),
  };

  recordingButtonText.value = "Start Recording";
  captureStatusMessage.value = "Recording saved in the panel preview for human review.";
}

async function stopDebuggerRecording(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: "STOP_TAB_RECORDING",
      tabId: activeTabId.value,
    });
  } catch {}
}
