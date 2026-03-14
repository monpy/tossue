import { signal, computed } from "@preact/signals";

export type DebuggerEvent = {
  id: number;
  kind: "network" | "runtime" | "log";
  text: string;
  level?: "error" | "warn" | "info";
  at: string;
};

export type DebuggerState = {
  attached: boolean;
  error: string | null;
};

export const debuggerState = signal<DebuggerState>({
  attached: false,
  error: null,
});

export const events = signal<DebuggerEvent[]>([]);

let eventIdCounter = 0;

export function addEvent(event: Omit<DebuggerEvent, "id">) {
  eventIdCounter++;
  events.value = [{ ...event, id: eventIdCounter }, ...events.value];
}

export function setDebuggerAttached(attached: boolean) {
  debuggerState.value = { ...debuggerState.value, attached, error: null };
}

export function setDebuggerError(error: string) {
  debuggerState.value = { ...debuggerState.value, attached: false, error };
}

export const statusMessage = computed(() => {
  const state = debuggerState.value;
  if (state.error) {
    return state.error;
  }
  return state.attached
    ? "Debugger attached. Listening for Runtime/Log/Network events."
    : "Debugger is not attached.";
});
