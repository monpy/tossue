const statusNode = document.querySelector("#devtoolsStatus");
const eventsNode = document.querySelector("#devtoolsEvents");
const tabId = chrome.devtools.inspectedWindow.tabId;

document.querySelector("#attachDebugger").addEventListener("click", attachDebugger);

chrome.devtools.network.onRequestFinished.addListener((request) => {
  const status = request.response?.status || 0;
  if (status >= 400 || status === 0) {
    emitEvent(`network ${request.request.method} ${status} ${request.request.url}`);
    chrome.runtime.sendMessage({
      type: "DEVTOOLS_EVENT",
      tabId,
      payload: {
        kind: "network",
        entry: {
          method: request.request.method,
          url: request.request.url,
          status,
          at: new Date().toISOString()
        }
      }
    });
  }
});

async function attachDebugger() {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "Log.enable");
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
    await chrome.debugger.sendCommand({ tabId }, "Network.enable");
    chrome.debugger.onEvent.addListener(handleDebuggerEvent);
    statusNode.textContent = "Debugger attached. Listening for Runtime/Log/Network events.";
  } catch (error) {
    statusNode.textContent = error.message;
  }
}

function handleDebuggerEvent(source, method, params) {
  if (source.tabId !== tabId) {
    return;
  }

  if (method === "Runtime.exceptionThrown") {
    const description = params.exceptionDetails?.text || "Runtime exception";
    emitEvent(`runtime ${description}`);
    chrome.runtime.sendMessage({
      type: "DEVTOOLS_EVENT",
      tabId,
      payload: {
        kind: "console",
        entry: {
          level: "error",
          message: description,
          at: new Date().toISOString()
        }
      }
    });
  }

  if (method === "Log.entryAdded") {
    const level = params.entry?.level || "info";
    const text = params.entry?.text || "";
    emitEvent(`log ${level} ${text}`);
    if (level === "error" || level === "warning") {
      chrome.runtime.sendMessage({
        type: "DEVTOOLS_EVENT",
        tabId,
        payload: {
          kind: "console",
          entry: {
            level: level === "warning" ? "warn" : "error",
            message: text,
            at: new Date().toISOString()
          }
        }
      });
    }
  }
}

function emitEvent(text) {
  const item = document.createElement("li");
  item.textContent = text;
  eventsNode.prepend(item);
}
