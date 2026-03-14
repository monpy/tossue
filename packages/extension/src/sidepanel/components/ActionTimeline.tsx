import { useRef, useEffect } from "preact/hooks";
import type { UserAction } from "../../shared/types";
import {
  currentState,
  issueOptions,
  canUndo,
  canRedo,
  hasActions,
} from "../store/signals";
import {
  clearActions,
  undoActions,
  redoActions,
  deleteAction,
  trimActionsBefore,
  handleIssueOptionsChange,
} from "../hooks/useActions";
import { highlightArea, clearHighlight } from "../hooks/useCapture";
import { formatActionIndex, formatActionTitle, formatActionDetail, escapeHtml } from "../utils/format";

export function ActionTimeline() {
  const state = currentState.value;
  const actions = state.actions || [];
  const listRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  useEffect(() => {
    if (wasNearBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [actions.length]);

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
        <h2>Recent Actions</h2>
        <div class="button-row">
          <label class="inline-switch">
            <input
              id="includeActionsInIssue"
              type="checkbox"
              checked={issueOptions.value.includeActions}
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
            disabled={!hasActions.value}
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
        {actions.map((action, index) => (
          <ActionRow
            key={action.id}
            action={action}
            index={index}
            onHover={handleActionHover}
            onLeave={handleActionLeave}
            onDelete={deleteAction}
            onTrimBefore={trimActionsBefore}
          />
        ))}
      </div>
    </section>
  );
}

type ActionRowProps = {
  action: UserAction;
  index: number;
  onHover: (action: UserAction) => void;
  onLeave: () => void;
  onDelete: (id: string) => void;
  onTrimBefore: (id: string) => void;
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
          aria-label="Delete actions above this line"
          onClick={() => onTrimBefore(action.id)}
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
