import { useEffect } from "preact/hooks";
import {
  addEvent,
  setDebuggerAttached,
  setDebuggerError,
} from "../store/signals";

const tabId = chrome.devtools.inspectedWindow.tabId;

function notifyDevtoolsStatus(panelOpen: boolean, debuggerAttached: boolean) {
  chrome.runtime.sendMessage({
    type: "DEVTOOLS_STATUS_UPDATE",
    tabId,
    payload: { panelOpen, debuggerAttached },
  }).catch(() => {});
}

export function useDebugger() {
  useEffect(() => {
    // Notify that DevTools panel is open
    notifyDevtoolsStatus(true, false);

    const handleNetworkRequest = (
      request: chrome.devtools.network.Request
    ) => {
      const status = request.response?.status || 0;
      if (status >= 400 || status === 0) {
        addEvent({
          kind: "network",
          text: `${request.request.method} ${status} ${request.request.url}`,
          level: "error",
          at: new Date().toISOString(),
        });

        chrome.runtime.sendMessage({
          type: "DEVTOOLS_EVENT",
          tabId,
          payload: {
            kind: "network",
            entry: {
              method: request.request.method,
              url: request.request.url,
              status,
              at: new Date().toISOString(),
            },
          },
        });
      }
    };

    chrome.devtools.network.onRequestFinished.addListener(handleNetworkRequest);

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(
        handleNetworkRequest
      );
      // Notify that DevTools panel is closed
      notifyDevtoolsStatus(false, false);
    };
  }, []);
}

function handleDebuggerEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params?: object
) {
  if (source.tabId !== tabId) {
    return;
  }

  if (method === "Runtime.exceptionThrown") {
    const exceptionParams = params as {
      exceptionDetails?: { text?: string };
    };
    const description =
      exceptionParams?.exceptionDetails?.text || "Runtime exception";

    addEvent({
      kind: "runtime",
      text: description,
      level: "error",
      at: new Date().toISOString(),
    });

    chrome.runtime.sendMessage({
      type: "DEVTOOLS_EVENT",
      tabId,
      payload: {
        kind: "console",
        entry: {
          level: "error",
          message: description,
          at: new Date().toISOString(),
        },
      },
    });
  }

  if (method === "Log.entryAdded") {
    const logParams = params as {
      entry?: { level?: string; text?: string };
    };
    const level = logParams?.entry?.level || "info";
    const text = logParams?.entry?.text || "";

    addEvent({
      kind: "log",
      text: `${level}: ${text}`,
      level: level === "error" ? "error" : level === "warning" ? "warn" : "info",
      at: new Date().toISOString(),
    });

    if (level === "error" || level === "warning") {
      chrome.runtime.sendMessage({
        type: "DEVTOOLS_EVENT",
        tabId,
        payload: {
          kind: "console",
          entry: {
            level: level === "warning" ? "warn" : "error",
            message: text,
            at: new Date().toISOString(),
          },
        },
      });
    }
  }
}

export async function attachDebugger() {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "Log.enable");
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
    await chrome.debugger.sendCommand({ tabId }, "Network.enable");
    chrome.debugger.onEvent.addListener(handleDebuggerEvent);
    setDebuggerAttached(true);
    notifyDevtoolsStatus(true, true);
  } catch (error) {
    setDebuggerError(
      error instanceof Error ? error.message : "Failed to attach debugger"
    );
  }
}
