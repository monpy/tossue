import { useRef, useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import type { UserAction, ConsoleEntry, NetworkEntry } from "../../shared/types";
import {
  issueOptions,
  canUndo,
  canRedo,
  hasTimelineEntries,
  unifiedTimeline,
  TimelineEntry,
} from "../store/signals";
import {
  clearActions,
  undoActions,
  redoActions,
  deleteAction,
  deleteTimelineEntry,
  trimTimelineBefore,
  handleIssueOptionsChange,
} from "../hooks/useActions";
import { highlightArea, clearHighlight } from "../hooks/useCapture";
import { formatActionIndex, formatActionTitle, formatActionDetail } from "../utils/format";

export function ActionTimeline() {
  const timeline = useComputed(() => unifiedTimeline.value);
  const includeActions = useComputed(() => issueOptions.value.includeActions);
  const listRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  useEffect(() => {
    if (wasNearBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [timeline.value.length]);

  const handleScroll = () => {
    if (listRef.current) {
      const threshold = 40;
      wasNearBottomRef.current =
        listRef.current.scrollTop + listRef.current.clientHeight >=
        listRef.current.scrollHeight - threshold;
    }
  };

  const handleActionHover = (action: UserAction) => {
    if (action.targetInfo) {
      highlightArea(action.targetInfo);
    }
  };

  const handleActionLeave = () => {
    clearHighlight();
  };

  return (
    <section class="card">
      <div class="section-title-row">
        <h2>Timeline</h2>
        <div class="button-row">
          <label class="inline-switch">
            <input
              id="includeActionsInIssue"
              type="checkbox"
              checked={includeActions.value}
              onChange={(e) => handleIssueOptionsChange((e.target as HTMLInputElement).checked)}
            />
            <span>Use in issue</span>
          </label>
          <button
            id="undoActions"
            class="secondary icon-only"
            type="button"
            aria-label="Undo"
            disabled={!canUndo.value}
            onClick={undoActions}
          >
            ←
          </button>
          <button
            id="redoActions"
            class="secondary icon-only"
            type="button"
            aria-label="Redo"
            disabled={!canRedo.value}
            onClick={redoActions}
          >
            →
          </button>
          <button
            id="clearActions"
            class="secondary icon-only"
            type="button"
            aria-label="Clear all"
            disabled={!hasTimelineEntries.value}
            onClick={clearActions}
          >
            ⊘
          </button>
        </div>
      </div>
      <div
        id="actionsList"
        class="action-timeline"
        ref={listRef}
        onScroll={handleScroll}
      >
        {timeline.value.map((entry, index) => (
          <TimelineRow
            key={getEntryId(entry)}
            entry={entry}
            index={index}
            onActionHover={handleActionHover}
            onActionLeave={handleActionLeave}
            onDeleteAction={deleteAction}
            onDeleteEntry={deleteTimelineEntry}
            onTrimTimelineBefore={trimTimelineBefore}
          />
        ))}
      </div>
    </section>
  );
}

function getEntryId(entry: TimelineEntry): string {
  return entry.data.id;
}

type TimelineRowProps = {
  entry: TimelineEntry;
  index: number;
  onActionHover: (action: UserAction) => void;
  onActionLeave: () => void;
  onDeleteAction: (id: string) => void;
  onDeleteEntry: (id: string, kind: string) => void;
  onTrimTimelineBefore: (id: string, kind: string, at: string) => void;
};

function TimelineRow({
  entry,
  index,
  onActionHover,
  onActionLeave,
  onDeleteAction,
  onDeleteEntry,
  onTrimTimelineBefore,
}: TimelineRowProps) {
  if (entry.kind === "action") {
    return (
      <ActionRow
        action={entry.data}
        index={index}
        onHover={onActionHover}
        onLeave={onActionLeave}
        onDelete={onDeleteAction}
        onTrimBefore={(id, at) => onTrimTimelineBefore(id, "action", at)}
      />
    );
  }

  if (entry.kind === "console") {
    return (
      <ConsoleRow
        entry={entry.data}
        index={index}
        onDelete={(id) => onDeleteEntry(id, "console")}
        onTrimBefore={(id, at) => onTrimTimelineBefore(id, "console", at)}
      />
    );
  }

  if (entry.kind === "network") {
    return (
      <NetworkRow
        entry={entry.data}
        index={index}
        onDelete={(id) => onDeleteEntry(id, "network")}
        onTrimBefore={(id, at) => onTrimTimelineBefore(id, "network", at)}
      />
    );
  }

  return null;
}

type ActionRowProps = {
  action: UserAction;
  index: number;
  onHover: (action: UserAction) => void;
  onLeave: () => void;
  onDelete: (id: string) => void;
  onTrimBefore: (id: string, at: string) => void;
};

function ActionRow({ action, index, onHover, onLeave, onDelete, onTrimBefore }: ActionRowProps) {
  const label = formatActionTitle(action);
  const detail = formatActionDetail(action);

  return (
    <>
      {index > 0 && (
        <button
          type="button"
          class="action-cutline"
          data-action-command="trim-before"
          aria-label="Delete entries above this line"
          onClick={() => onTrimBefore(action.id, action.at)}
        >
          <span class="action-cutline-icon">✂</span>
          <span class="action-cutline-rule"></span>
        </button>
      )}
      <article
        class="action-row"
        data-action-id={action.id}
        data-highlightable={action.targetInfo ? "true" : undefined}
        onMouseOver={() => onHover(action)}
        onMouseOut={onLeave}
        onFocus={() => onHover(action)}
        onBlur={onLeave}
      >
        <span class="action-row-index">{formatActionIndex(index + 1)}</span>
        <div class="action-row-copy">
          <strong class="action-row-title">{label}</strong>
          {detail && <span class="action-row-detail">{detail}</span>}
        </div>
        <button
          class="action-icon-button"
          type="button"
          data-action-command="delete"
          aria-label="Delete action"
          onClick={() => onDelete(action.id)}
        >
          ×
        </button>
      </article>
    </>
  );
}

type ConsoleRowProps = {
  entry: ConsoleEntry & { id: string };
  index: number;
  onDelete: (id: string) => void;
  onTrimBefore: (id: string, at: string) => void;
};

function ConsoleRow({ entry, index, onDelete, onTrimBefore }: ConsoleRowProps) {
  const levelClass = entry.level === "error" ? "timeline-error" : "timeline-warn";
  const levelIcon = entry.level === "error" ? "⚠" : "⚡";

  return (
    <>
      {index > 0 && (
        <button
          type="button"
          class="action-cutline"
          data-action-command="trim-before"
          aria-label="Delete entries above this line"
          onClick={() => onTrimBefore(entry.id, entry.at)}
        >
          <span class="action-cutline-icon">✂</span>
          <span class="action-cutline-rule"></span>
        </button>
      )}
      <article class={`action-row ${levelClass}`} data-entry-id={entry.id}>
        <span class="action-row-index">{formatActionIndex(index + 1)}</span>
        <div class="action-row-copy">
          <strong class="action-row-title">
            {levelIcon} console.{entry.level}
          </strong>
          <span class="action-row-detail">{entry.message.slice(0, 100)}</span>
        </div>
        <button
          class="action-icon-button"
          type="button"
          data-action-command="delete"
          aria-label="Delete entry"
          onClick={() => onDelete(entry.id)}
        >
          ×
        </button>
      </article>
    </>
  );
}

type NetworkRowProps = {
  entry: NetworkEntry & { id: string };
  index: number;
  onDelete: (id: string) => void;
  onTrimBefore: (id: string, at: string) => void;
};

function NetworkRow({ entry, index, onDelete, onTrimBefore }: NetworkRowProps) {
  const statusText = entry.status === 0 ? "ERR" : entry.status.toString();
  const levelClass = entry.status >= 500 ? "timeline-error" : "timeline-warn";

  // Extract pathname from URL for display
  let displayUrl = entry.url;
  try {
    const url = new URL(entry.url);
    displayUrl = url.pathname + url.search;
  } catch {
    // Keep original URL if parsing fails
  }

  return (
    <>
      {index > 0 && (
        <button
          type="button"
          class="action-cutline"
          data-action-command="trim-before"
          aria-label="Delete entries above this line"
          onClick={() => onTrimBefore(entry.id, entry.at)}
        >
          <span class="action-cutline-icon">✂</span>
          <span class="action-cutline-rule"></span>
        </button>
      )}
      <article class={`action-row ${levelClass}`} data-entry-id={entry.id}>
        <span class="action-row-index">{formatActionIndex(index + 1)}</span>
        <div class="action-row-copy">
          <strong class="action-row-title">
            🌐 {entry.method} {statusText}
          </strong>
          <span class="action-row-detail">{displayUrl.slice(0, 80)}</span>
        </div>
        <button
          class="action-icon-button"
          type="button"
          data-action-command="delete"
          aria-label="Delete entry"
          onClick={() => onDelete(entry.id)}
        >
          ×
        </button>
      </article>
    </>
  );
}
