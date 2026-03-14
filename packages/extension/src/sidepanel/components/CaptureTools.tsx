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
import { escapeHtml, formatSelectedElement } from "../utils/format";

export function CaptureTools() {
  const state = currentState.value;
  const area = state.selectedArea;
  const recording = recordingState.value;
  const hasScreenshot = Boolean(state.screenshotDataUrl);
  const hasRecording = Boolean(recording.objectUrl);

  const handleAreaHoverStart = () => {
    if (area) {
      highlightArea(area);
    }
  };

  const handleAreaHoverEnd = () => {
    clearHighlight();
  };

  return (
    <section class="card">
      <div class="section-title-row">
        <h2>Captured Context</h2>
      </div>
      <div class="capture-tool-grid">
        <section class="capture-tool-card">
          <div class="capture-tool-head">
            <h3>Select Area</h3>
            <button id="selectArea" class="secondary" onClick={startAreaPicker}>
              {selectAreaButtonText.value}
            </button>
          </div>
          <div
            id="areaSummary"
            class={`summary-box compact ${area ? "" : "empty hidden"}`}
            onMouseEnter={handleAreaHoverStart}
            onMouseLeave={handleAreaHoverEnd}
            onFocus={handleAreaHoverStart}
            onBlur={handleAreaHoverEnd}
            tabIndex={area ? 0 : -1}
          >
            {area ? (
              <AreaSummaryContent area={area} />
            ) : (
              "No area selected."
            )}
          </div>
        </section>

        <section class="capture-tool-card">
          <div class="capture-tool-head">
            <h3>Capture Image</h3>
            <button id="captureScreenshot" class="secondary" onClick={startCaptureMode}>
              {captureButtonText.value}
            </button>
          </div>
          <div id="screenshotWrap" class={`preview-wrap ${hasScreenshot ? "" : "hidden"}`}>
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
              src={state.screenshotDataUrl}
            />
          </div>
        </section>

        <section class="capture-tool-card">
          <div class="capture-tool-head">
            <h3>Screen Recording</h3>
            <button id="toggleRecording" class="secondary" onClick={toggleRecording}>
              {recordingButtonText.value}
            </button>
          </div>
          <div id="recordingWrap" class={`preview-wrap ${hasRecording ? "" : "hidden"}`}>
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
              src={recording.objectUrl}
            />
          </div>
        </section>
      </div>
      <p id="captureStatus" class="status">
        {captureStatusMessage.value || "`Select Area` は DOM 要素選択、`Start Capture` は画面上の矩形キャプチャ、`Start Recording` は画面録画です。"}
      </p>
    </section>
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
