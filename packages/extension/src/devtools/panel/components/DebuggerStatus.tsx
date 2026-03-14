import { useComputed } from "@preact/signals";
import { statusMessage, debuggerState } from "../store/signals";
import { attachDebugger } from "../hooks/useDebugger";

export function DebuggerStatus() {
  const message = useComputed(() => statusMessage.value);
  const state = useComputed(() => debuggerState.value);

  return (
    <header class="app-header">
      <div>
        <p class="eyebrow">DevTools Mode</p>
        <h1>Diagnostics Bridge</h1>
      </div>
      <button
        onClick={attachDebugger}
        disabled={state.value.attached}
        class={state.value.attached ? "secondary" : ""}
      >
        {state.value.attached ? "Attached" : "Attach Debugger"}
      </button>
      <p class={`status ${state.value.error ? "error" : ""}`}>
        {message.value}
      </p>
    </header>
  );
}
