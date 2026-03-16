import { useTabState } from "./hooks/useTabState";
import { useRecording } from "./hooks/useRecording";
import { useCapture } from "./hooks/useCapture";
import { useDevtoolsStatus } from "./hooks/useDevtoolsStatus";
import { useSettings } from "./hooks/useSettings";
import { TabBar } from "./components/tabs/TabBar";
import { MainTab } from "./components/MainTab";
import { SettingsTab } from "./components/SettingsTab";
import { WatchedTabIndicator } from "./components/WatchedTabIndicator";
import { activeSidepanelTab } from "./store/signals";

export function App() {
  useTabState();
  useRecording();
  useCapture();
  useDevtoolsStatus();
  useSettings();

  return (
    <main class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">AI-ready issue composer</p>
          <h1>Tossue</h1>
        </div>
      </header>

      <WatchedTabIndicator />

      <TabBar />

      {activeSidepanelTab.value === "main" && <MainTab />}
      {activeSidepanelTab.value === "settings" && <SettingsTab />}
    </main>
  );
}
