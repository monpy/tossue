import { useComputed } from "@preact/signals";
import {
  currentState,
  recordingState,
  captureStatusMessage,
  selectAreaButtonText,
  captureButtonText,
  recordingButtonText,
} from "../store/signals";
import { startAreaPicker, startCaptureMode, clearScreenshotPreview, highlightArea, clearHighlight } from "../hooks/useCapture";
import { toggleRecording, clearRecordingPreview } from "../hooks/useRecording";
import { formatSelectedElement } from "../utils/format";
import { Button, Card } from "./ui";

export function CaptureTools() {
  const state = useComputed(() => currentState.value);
  const area = useComputed(() => currentState.value.selectedArea);
  const recording = useComputed(() => recordingState.value);
  const hasScreenshot = useComputed(() => Boolean(currentState.value.screenshotDataUrl));
  const hasRecording = useComputed(() => Boolean(recordingState.value.objectUrl));

  const handleAreaHoverStart = () => {
    if (area.value) {
      highlightArea(area.value);
    }
  };

  const handleAreaHoverEnd = () => {
    clearHighlight();
  };

  return (
    <Card>
      <div class="section-title-row">
        <h2 class="text-base font-bold">Captured Context</h2>
      </div>
      <div class="capture-tool-grid">
        <Card variant="nested">
          <div class="capture-tool-head">
            <h3 class="text-[13px] font-bold">Select Area</h3>
            <Button id="selectArea" variant="secondary" onClick={startAreaPicker}>
              {selectAreaButtonText.value}
            </Button>
          </div>
          <div
            id="areaSummary"
            class={`summary-box compact ${area.value ? "" : "empty hidden"}`}
            onMouseEnter={handleAreaHoverStart}
            onMouseLeave={handleAreaHoverEnd}
            onFocus={handleAreaHoverStart}
            onBlur={handleAreaHoverEnd}
            tabIndex={area.value ? 0 : -1}
          >
            {area.value ? (
              <AreaSummaryContent area={area.value} />
            ) : (
              "No area selected."
            )}
          </div>
        </Card>

        <Card variant="nested">
          <div class="capture-tool-head">
            <h3 class="text-[13px] font-bold">Capture Image</h3>
            <Button id="captureScreenshot" variant="secondary" onClick={startCaptureMode}>
              {captureButtonText.value}
            </Button>
          </div>
          <div id="screenshotWrap" class={`preview-wrap ${hasScreenshot.value ? "" : "hidden"}`}>
            <button
              id="clearScreenshot"
              class="preview-close"
              type="button"
              aria-label="Remove screenshot"
              onClick={clearScreenshotPreview}
            >
              ×
            </button>
            <img
              id="screenshotPreview"
              class="screenshot"
              alt="Screenshot preview"
              src={state.value.screenshotDataUrl}
            />
          </div>
        </Card>

        <Card variant="nested">
          <div class="capture-tool-head">
            <h3 class="text-[13px] font-bold">Screen Recording</h3>
            <Button id="toggleRecording" variant="secondary" onClick={toggleRecording}>
              {recordingButtonText.value}
            </Button>
          </div>
          <div id="recordingWrap" class={`preview-wrap ${hasRecording.value ? "" : "hidden"}`}>
            <button
              id="clearRecording"
              class="preview-close"
              type="button"
              aria-label="Remove recording"
              onClick={clearRecordingPreview}
            >
              ×
            </button>
            <video
              id="recordingPreview"
              class="screenshot"
              controls
              playsInline
              src={recording.value.objectUrl}
            />
          </div>
        </Card>
      </div>
      <p id="captureStatus" class="status">
        {captureStatusMessage.value || "`Select Area` は DOM 要素選択、`Start Capture` は画面上の矩形キャプチャ、`Start Recording` は画面録画です。"}
      </p>
    </Card>
  );
}

type AreaSummaryContentProps = {
  area: NonNullable<typeof currentState.value.selectedArea>;
};

function AreaSummaryContent({ area }: AreaSummaryContentProps) {
  const primaryName = area.framework?.selectedComponent || formatSelectedElement(area);

  return (
    <div class="area-head">
      <div class="area-title-row">
        <strong class="area-title">{primaryName}</strong>
        {area.framework?.framework && (
          <span class="area-chip">{area.framework.framework}</span>
        )}
      </div>
      {area.framework?.selectedComponent && primaryName !== formatSelectedElement(area) && (
        <p class="area-subtle">{formatSelectedElement(area)}</p>
      )}
    </div>
  );
}
