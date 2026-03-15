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

  // Framework component detection - runs in page context where framework internals are accessible
  window.addEventListener("__tossue_get_framework_component__", ((event: CustomEvent) => {
    const { selector } = event.detail || {};
    if (!selector) return;

    try {
      const element = document.querySelector(selector);
      if (!element) {
        emit("framework_component", { selector, component: null });
        return;
      }

      // Try React first, then Vue
      const reactInfo = getReactComponentInfo(element);
      if (reactInfo) {
        emit("framework_component", { selector, component: reactInfo });
        return;
      }

      const vueInfo = getVueComponentInfo(element);
      emit("framework_component", { selector, component: vueInfo });
    } catch (e) {
      emit("framework_component", { selector, component: null, error: String(e) });
    }
  }) as EventListener);

  // React component detection
  function getReactComponentInfo(element: Element): { framework: string; selectedComponent: string; componentTrail: string[] } | null {
    let current: Element | null = element;

    while (current && current !== document.body) {
      const fiber = findReactFiber(current);
      if (fiber) {
        const trail = buildReactTrail(fiber);
        if (trail.length > 0) {
          return {
            framework: "React",
            selectedComponent: trail[0],
            componentTrail: trail.slice(0, 6),
          };
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  function findReactFiber(element: Element): unknown {
    const el = element as Element & { [key: string]: unknown };
    try {
      for (const key of Object.keys(el)) {
        if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
          return el[key];
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  function buildReactTrail(fiber: unknown): string[] {
    const trail: string[] = [];
    let current = fiber as { elementType?: unknown; type?: unknown; return?: unknown } | null;

    while (current && trail.length < 6) {
      const name = getReactComponentName(current);
      if (name && !trail.includes(name)) {
        trail.push(name);
      }
      current = current.return as typeof current;
    }

    return trail;
  }

  function getReactComponentName(fiber: { elementType?: unknown; type?: unknown }): string {
    const type = (fiber.elementType || fiber.type) as { displayName?: string; name?: string } | string | null;
    if (!type) return "";
    if (typeof type === "string") return type;
    return type.displayName || type.name || "";
  }

  function getVueComponentInfo(element: Element): { framework: string; selectedComponent: string; componentTrail: string[]; filePath?: string } | null {
    // Try to find Vue instance on element or ancestors
    let current: Element | null = element;

    while (current && current !== document.body) {
      // Check for Vue 3 internal properties
      const instance = findVue3Instance(current);
      if (instance) {
        const trail = buildVue3Trail(instance);
        if (trail.length > 0) {
          return {
            framework: "Vue",
            selectedComponent: trail[0],
            componentTrail: trail.slice(0, 6),
          };
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  function findVue3Instance(element: Element): unknown {
    const el = element as Element & {
      __vueParentComponent?: unknown;
      __vue_app__?: { _instance?: unknown };
      [key: string]: unknown;
    };

    // Vue 3: __vueParentComponent
    if (el.__vueParentComponent) {
      return el.__vueParentComponent;
    }

    // Vue 3 app root
    if (el.__vue_app__?._instance) {
      return el.__vue_app__._instance;
    }

    // Check for __vnode or other Vue 3 properties
    try {
      for (const key of Object.keys(el)) {
        if (key.startsWith("__vnode")) {
          const vnode = el[key] as { component?: unknown };
          if (vnode?.component) {
            return vnode.component;
          }
        }
        if (key.startsWith("__vue") && key !== "__vue_app__") {
          const value = el[key] as { type?: unknown; proxy?: unknown };
          if (value && typeof value === "object" && (value.type || value.proxy)) {
            return value;
          }
        }
      }
    } catch {
      // Ignore
    }

    return null;
  }

  function buildVue3Trail(instance: unknown): string[] {
    const trail: string[] = [];
    let current = instance as { type?: { name?: string; __name?: string }; parent?: unknown; proxy?: { $options?: { name?: string } } } | null;

    while (current && trail.length < 6) {
      const name = getVue3ComponentName(current);
      if (name && !trail.includes(name)) {
        trail.push(name);
      }
      current = current.parent as typeof current;
    }

    return trail;
  }

  function getVue3ComponentName(instance: { type?: { name?: string; __name?: string; displayName?: string }; proxy?: { $options?: { name?: string } } }): string {
    const type = instance.type;
    if (!type) return "";
    if (typeof type === "string") return type;
    return type.name || type.__name || type.displayName || instance.proxy?.$options?.name || "";
  }
})();
