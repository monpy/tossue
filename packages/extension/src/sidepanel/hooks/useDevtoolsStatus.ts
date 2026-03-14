import { useEffect } from "preact/hooks";
import { devtoolsStatus, activeTabId } from "../store/signals";
import type { DevtoolsStatus, Message } from "../../shared/types";

export function useDevtoolsStatus() {
  useEffect(() => {
    // Fetch initial status
    const tabId = activeTabId.value;
    if (tabId) {
      chrome.runtime
        .sendMessage({ type: "GET_DEVTOOLS_STATUS", tabId })
        .then((response) => {
          if (response?.ok && response.devtoolsStatus) {
            devtoolsStatus.value = response.devtoolsStatus;
          }
        })
        .catch(() => {});
    }

    // Listen for status updates
    const handleMessage = (message: Message) => {
      if (message.type === "DEVTOOLS_STATUS_UPDATE") {
        const status = message.payload as DevtoolsStatus;
        if (status) {
          devtoolsStatus.value = status;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
}

export function refreshDevtoolsStatus() {
  const tabId = activeTabId.value;
  if (tabId) {
    chrome.runtime
      .sendMessage({ type: "GET_DEVTOOLS_STATUS", tabId })
      .then((response) => {
        if (response?.ok && response.devtoolsStatus) {
          devtoolsStatus.value = response.devtoolsStatus;
        }
      })
      .catch(() => {});
  }
}
