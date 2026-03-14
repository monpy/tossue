import { useDebugger } from "./hooks/useDebugger";
import { DebuggerStatus } from "./components/DebuggerStatus";
import { EventList } from "./components/EventList";

export function App() {
  useDebugger();

  return (
    <main class="app-shell devtools-shell">
      <DebuggerStatus />
      <EventList />
    </main>
  );
}
