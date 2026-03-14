// This script runs in the PAGE context (not content script context)
// It intercepts fetch, XHR, console.error/warn, and error events
// and sends them to the content script via custom events

(function () {
  const TOSSUE_EVENT = "__tossue_capture__";

  function emit(type: string, payload: unknown) {
    window.dispatchEvent(
      new CustomEvent(TOSSUE_EVENT, {
        detail: { type, payload },
      })
    );
  }

  function stringify(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  // Capture fetch errors
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const startedAt = new Date().toISOString();
    const input = args[0];
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const method =
      (args[1] && typeof args[1] === "object" && args[1].method) || "GET";

    try {
      const response = await originalFetch(...args);
      if (!response.ok) {
        emit("network", {
          method,
          url,
          status: response.status,
          at: startedAt,
        });
      }
      return response;
    } catch (error) {
      emit("network", {
        method,
        url,
        status: 0,
        at: startedAt,
        error: stringify(error),
      });
      throw error;
    }
  };

  // Capture XHR errors
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    (this as XMLHttpRequest & { __method?: string; __url?: string }).__method =
      method;
    (this as XMLHttpRequest & { __method?: string; __url?: string }).__url =
      String(url);
    return originalOpen.call(
      this,
      method,
      url,
      ...(rest as [boolean?, string?, string?])
    );
  };

  XMLHttpRequest.prototype.send = function (...args: Parameters<typeof originalSend>) {
    const startedAt = new Date().toISOString();
    const xhr = this as XMLHttpRequest & { __method?: string; __url?: string };

    this.addEventListener("loadend", () => {
      if (this.status >= 400 || this.status === 0) {
        emit("network", {
          method: xhr.__method || "GET",
          url: xhr.__url || location.href,
          status: this.status,
          at: startedAt,
        });
      }
    });

    return originalSend.apply(this, args);
  };

  // Capture console.error and console.warn
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = function (...args: unknown[]) {
    emit("console", {
      level: "error",
      message: args.map((a) => stringify(a)).join(" "),
      at: new Date().toISOString(),
    });
    return originalError(...args);
  };

  console.warn = function (...args: unknown[]) {
    emit("console", {
      level: "warn",
      message: args.map((a) => stringify(a)).join(" "),
      at: new Date().toISOString(),
    });
    return originalWarn(...args);
  };

  // Capture uncaught errors
  window.addEventListener("error", (event) => {
    emit("console", {
      level: "error",
      message: `${event.message} (${event.filename}:${event.lineno})`,
      at: new Date().toISOString(),
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    emit("console", {
      level: "error",
      message: `Unhandled rejection: ${stringify(event.reason)}`,
      at: new Date().toISOString(),
    });
  });
})();
