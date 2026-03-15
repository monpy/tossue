import { activeSidepanelTab, type SidepanelTab } from "../../store/signals";

interface Tab {
  id: SidepanelTab;
  label: string;
}

const TABS: Tab[] = [
  { id: "main", label: "Main" },
  { id: "settings", label: "Settings" },
];

export function TabBar() {
  return (
    <div class="tab-bar" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeSidepanelTab.value === tab.id}
          class={`tab-button ${activeSidepanelTab.value === tab.id ? "tab-button--active" : ""}`}
          onClick={() => {
            activeSidepanelTab.value = tab.id;
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
