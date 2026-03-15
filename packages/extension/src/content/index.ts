const overlayState = {
  active: false,
  mode: "",
  hoveredElement: null,
  outline: null,
  captureBox: null,
  previewOutline: null,
  toast: null,
  dragStart: null
};

const recentActions = [];
const MAX_ACTIONS = 25;
let lastKnownUrl = location.href;

bootstrap();

function bootstrap() {
  installMessageListener();
  installActionLogging();
  installPageContextCapture();
  installUrlTracking();
}

function installPageContextCapture() {
  // Inject script into page context to capture fetch/XHR/console
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/content/injected.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Listen for events from injected script
  window.addEventListener("__tossue_capture__", ((event: CustomEvent) => {
    const { type, payload } = event.detail;
    if (type === "console") {
      safeSendMessage({ type: "CONSOLE_EVENT", payload });
    } else if (type === "network") {
      safeSendMessage({ type: "NETWORK_EVENT", payload });
    }
  }) as EventListener);
}

function installMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "START_AREA_PICKER") {
      startAreaPicker();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "START_CAPTURE_PICKER") {
      startCapturePicker();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "HIGHLIGHT_SELECTED_AREA") {
      highlightSelectedArea(message.payload);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CLEAR_SELECTED_AREA_HIGHLIGHT") {
      clearSelectedAreaHighlight();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "STOP_PICKER") {
      stopAreaPicker();
      sendResponse({ ok: true });
    }
  });
}

function installActionLogging() {
  const handler = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const linkTarget = target?.closest?.("a[href]") || null;
    const entry = {
      type: event.type,
      at: new Date().toISOString(),
      target: describeElement(target),
      valueSnippet: extractValueSnippet(target),
      targetInfo: target ? serializeElement(target) : null,
      href: linkTarget?.href || ""
    };

    recentActions.push(entry);
    recentActions.splice(0, Math.max(0, recentActions.length - MAX_ACTIONS));
    safeSendMessage({ type: "ACTION_LOGGED", payload: entry });
  };

  ["click", "input", "change", "submit"].forEach((eventName) => {
    addEventListener(eventName, handler, true);
  });

  const logNavigation = (kind, detail) => {
    lastKnownUrl = location.href;
    safeSendMessage({
      type: "ACTION_LOGGED",
      payload: {
        type: "navigation",
        at: new Date().toISOString(),
        target: location.href,
        valueSnippet: detail,
        navigationKind: kind
      }
    });
  };

  addEventListener("popstate", () => {
    logNavigation("popstate", "Browser history navigation");
  });

  addEventListener("hashchange", () => {
    logNavigation("hashchange", `Hash changed to ${location.hash || "#"}`);
  });

  const originalPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    const result = originalPushState(...args);
    logNavigation("pushState", `pushState -> ${location.href}`);
    return result;
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    const result = originalReplaceState(...args);
    logNavigation("replaceState", `replaceState -> ${location.href}`);
    return result;
  };
}

function installUrlTracking() {
  setInterval(() => {
    if (location.href === lastKnownUrl) {
      return;
    }

    const previousUrl = lastKnownUrl;
    lastKnownUrl = location.href;
    safeSendMessage({
      type: "ACTION_LOGGED",
      payload: {
        type: "navigation",
        at: new Date().toISOString(),
        target: location.href,
        valueSnippet: `URL changed from ${previousUrl}`,
        navigationKind: "urlchange"
      }
    });
  }, 500);
}

function startAreaPicker() {
  // Stop any existing picker first
  if (overlayState.active) {
    stopAreaPicker();
  }

  overlayState.active = true;
  overlayState.mode = "area";
  overlayState.outline = createOutline();
  document.documentElement.appendChild(overlayState.outline);

  addEventListener("mousemove", handlePointerMove, true);
  addEventListener("click", handlePointerClick, true);
  addEventListener("keydown", handleEscape, true);
}

function startCapturePicker() {
  // Stop any existing picker first
  if (overlayState.active) {
    stopAreaPicker();
  }

  overlayState.active = true;
  overlayState.mode = "capture";
  overlayState.captureBox = createCaptureBox();
  document.documentElement.appendChild(overlayState.captureBox);

  addEventListener("mousedown", handleCaptureStart, true);
  addEventListener("mousemove", handleCaptureMove, true);
  addEventListener("mouseup", handleCaptureEnd, true);
  addEventListener("keydown", handleEscape, true);
}

function stopAreaPicker() {
  overlayState.active = false;
  overlayState.mode = "";
  overlayState.hoveredElement = null;
  overlayState.dragStart = null;

  removeEventListener("mousemove", handlePointerMove, true);
  removeEventListener("click", handlePointerClick, true);
  removeEventListener("mousedown", handleCaptureStart, true);
  removeEventListener("mousemove", handleCaptureMove, true);
  removeEventListener("mouseup", handleCaptureEnd, true);
  removeEventListener("keydown", handleEscape, true);

  overlayState.outline?.remove();
  overlayState.outline = null;
  overlayState.captureBox?.remove();
  overlayState.captureBox = null;
}

function handlePointerMove(event) {
  if (!overlayState.active || overlayState.mode !== "area") {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  overlayState.hoveredElement = target;
  paintOutline(target);
}

function handlePointerClick(event) {
  if (!overlayState.active || overlayState.mode !== "area") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const target = event.target instanceof Element ? event.target : null;
  const payload = target ? serializeElement(target) : null;
  flashSelectionFeedback(target);
  safeSendMessage({ type: "AREA_SELECTED", payload });
  stopAreaPicker();
}

function handleEscape(event) {
  if (event.key === "Escape") {
    const mode = overlayState.mode;
    stopAreaPicker();
    safeSendMessage({ type: "PICKER_CANCELLED", payload: { mode } });
  }
}

function handleCaptureStart(event) {
  if (!overlayState.active || overlayState.mode !== "capture" || event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  overlayState.dragStart = {
    x: event.clientX,
    y: event.clientY
  };

  if (overlayState.captureBox) {
    overlayState.captureBox.style.display = "block";
    overlayState.captureBox.style.left = `${event.clientX}px`;
    overlayState.captureBox.style.top = `${event.clientY}px`;
    overlayState.captureBox.style.width = "0px";
    overlayState.captureBox.style.height = "0px";
  }
}

function handleCaptureMove(event) {
  if (!overlayState.active || overlayState.mode !== "capture" || !overlayState.dragStart || !overlayState.captureBox) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  paintCaptureBox(overlayState.dragStart, {
    x: event.clientX,
    y: event.clientY
  });
}

function handleCaptureEnd(event) {
  if (!overlayState.active || overlayState.mode !== "capture" || !overlayState.dragStart) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const rect = normalizeRect(overlayState.dragStart, {
    x: event.clientX,
    y: event.clientY
  });

  if (rect.width < 8 || rect.height < 8) {
    stopAreaPicker();
    return;
  }

  flashCaptureFeedback(rect);
  safeSendMessage({
    type: "CAPTURE_RECT_SELECTED",
    payload: {
      rect,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      capturedAt: Date.now(),
      url: location.href
    }
  });
  stopAreaPicker();
}

function createOutline() {
  const outline = document.createElement("div");
  outline.style.position = "fixed";
  outline.style.pointerEvents = "none";
  outline.style.zIndex = "2147483647";
  outline.style.border = "2px solid #ff6b00";
  outline.style.background = "rgba(255, 107, 0, 0.08)";
  outline.style.boxSizing = "border-box";
  outline.style.display = "none";
  return outline;
}

function createCaptureBox() {
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.pointerEvents = "none";
  box.style.zIndex = "2147483647";
  box.style.border = "2px solid #bb5a1d";
  box.style.background = "rgba(187, 90, 29, 0.16)";
  box.style.boxSizing = "border-box";
  box.style.display = "none";
  box.style.borderRadius = "6px";
  return box;
}

function createPreviewOutline() {
  const outline = document.createElement("div");
  outline.style.position = "fixed";
  outline.style.pointerEvents = "none";
  outline.style.zIndex = "2147483646";
  outline.style.border = "2px solid #2f6fed";
  outline.style.background = "rgba(47, 111, 237, 0.12)";
  outline.style.boxSizing = "border-box";
  outline.style.borderRadius = "8px";
  outline.style.display = "none";
  return outline;
}

function createToast() {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.right = "16px";
  toast.style.bottom = "16px";
  toast.style.zIndex = "2147483647";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "999px";
  toast.style.background = "rgba(27, 26, 23, 0.92)";
  toast.style.color = "#fff";
  toast.style.font = '600 13px "IBM Plex Sans", sans-serif';
  toast.style.boxShadow = "0 10px 24px rgba(0,0,0,0.2)";
  toast.style.pointerEvents = "none";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 120ms ease";
  return toast;
}

function paintOutline(element) {
  if (!overlayState.outline || !element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  overlayState.outline.style.display = "block";
  overlayState.outline.style.left = `${rect.left}px`;
  overlayState.outline.style.top = `${rect.top}px`;
  overlayState.outline.style.width = `${rect.width}px`;
  overlayState.outline.style.height = `${rect.height}px`;
}

function flashSelectionFeedback(element) {
  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (overlayState.outline) {
    overlayState.outline.style.display = "block";
    overlayState.outline.style.left = `${rect.left}px`;
    overlayState.outline.style.top = `${rect.top}px`;
    overlayState.outline.style.width = `${rect.width}px`;
    overlayState.outline.style.height = `${rect.height}px`;
    overlayState.outline.style.border = "2px solid #2b8a3e";
    overlayState.outline.style.background = "rgba(43, 138, 62, 0.14)";
  }

  const toast = overlayState.toast || createToast();
  overlayState.toast = toast;
  toast.textContent = `Selected: ${describeElement(element) || element.tagName.toLowerCase()}`;
  if (!toast.isConnected) {
    document.documentElement.appendChild(toast);
  }

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 1200);
}

function flashCaptureFeedback(rect) {
  if (overlayState.captureBox) {
    overlayState.captureBox.style.display = "block";
    overlayState.captureBox.style.left = `${rect.x}px`;
    overlayState.captureBox.style.top = `${rect.y}px`;
    overlayState.captureBox.style.width = `${rect.width}px`;
    overlayState.captureBox.style.height = `${rect.height}px`;
    overlayState.captureBox.style.border = "2px solid #2b8a3e";
    overlayState.captureBox.style.background = "rgba(43, 138, 62, 0.14)";
  }

  const toast = overlayState.toast || createToast();
  overlayState.toast = toast;
  toast.textContent = `Captured region: ${rect.width}x${rect.height}`;
  if (!toast.isConnected) {
    document.documentElement.appendChild(toast);
  }

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 1200);
}

function highlightSelectedArea(payload) {
  if (!payload) {
    return;
  }

  const target = resolveHighlightTarget(payload);
  const rect = target?.getBoundingClientRect() || payload.rect;
  if (!rect) {
    return;
  }

  const outline = overlayState.previewOutline || createPreviewOutline();
  overlayState.previewOutline = outline;
  if (!outline.isConnected) {
    document.documentElement.appendChild(outline);
  }

  outline.style.display = "block";
  outline.style.left = `${Math.round(rect.x)}px`;
  outline.style.top = `${Math.round(rect.y)}px`;
  outline.style.width = `${Math.round(rect.width)}px`;
  outline.style.height = `${Math.round(rect.height)}px`;
}

function clearSelectedAreaHighlight() {
  if (overlayState.previewOutline) {
    overlayState.previewOutline.style.display = "none";
  }
}

function resolveHighlightTarget(payload) {
  if (payload.selector) {
    try {
      return document.querySelector(payload.selector);
    } catch (_error) {
      return null;
    }
  }

  return null;
}

function paintCaptureBox(start, end) {
  const rect = normalizeRect(start, end);
  overlayState.captureBox.style.left = `${rect.x}px`;
  overlayState.captureBox.style.top = `${rect.y}px`;
  overlayState.captureBox.style.width = `${rect.width}px`;
  overlayState.captureBox.style.height = `${rect.height}px`;
}

function normalizeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

function serializeElement(element) {
  const selected = selectRepresentativeElement(element);
  const rect = selected.getBoundingClientRect();
  const framework = detectFrameworkInfo(selected) || detectDomTreeInfo(selected);
  return {
    url: location.href,
    pageTitle: document.title || "",
    browser: detectBrowserLabel(),
    selector: buildSelector(selected),
    xpath: buildXPath(selected),
    tagName: selected.tagName.toLowerCase(),
    id: selected.id || "",
    classes: Array.from(selected.classList),
    role: selected.getAttribute("role") || "",
    ariaLabel: selected.getAttribute("aria-label") || "",
    textSnippet: extractElementLabel(selected),
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    framework,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    }
  };
}

function selectRepresentativeElement(element) {
  // Always return the element the user clicked on
  return element;
}

function scoreElementCandidate(element) {
  const text = extractElementLabel(element);
  const rect = element.getBoundingClientRect();
  let score = 0;

  if (matchesInteractiveElement(element)) {
    score += 40;
  }
  if (text.length >= 1 && text.length <= 40) {
    score += 30;
  } else if (text.length <= 80) {
    score += 10;
  } else {
    score -= 20;
  }
  if (rect.width * rect.height < 80000) {
    score += 15;
  }
  if (element.id || element.getAttribute("aria-label") || element.getAttribute("data-testid")) {
    score += 10;
  }
  if (isDismissLikeElement(element, text)) {
    score -= 50;
  }

  return score;
}

function isDismissLikeElement(element, text) {
  const haystack = `${text} ${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`.toLowerCase();
  return /close|dismiss|cancel|閉じる|とじる|×/.test(haystack);
}

function matchesInteractiveElement(element) {
  return Boolean(
    element.closest("button,a,[role='button'],input,summary,label") === element ||
      element.hasAttribute("onclick") ||
      element.tabIndex >= 0
  );
}

function extractElementLabel(element) {
  const aria = normalizeWhitespace(element.getAttribute("aria-label") || "");
  if (aria) {
    return aria.slice(0, 80);
  }

  const ownText = Array.from(element.childNodes as NodeListOf<ChildNode>)
    .filter((node): node is ChildNode => node.nodeType === Node.TEXT_NODE)
    .map((node) => normalizeWhitespace(node.textContent || ""))
    .filter(Boolean)
    .join(" ");
  if (ownText) {
    return ownText.slice(0, 80);
  }

  return normalizeWhitespace(element.textContent || "").slice(0, 80);
}

function detectBrowserLabel() {
  const ua = navigator.userAgent || "";
  const chrome = ua.match(/Chrome\/(\d+)/);
  if (chrome) {
    return `Chrome ${chrome[1]}`;
  }

  const safari = ua.match(/Version\/(\d+).+Safari/);
  if (safari) {
    return `Safari ${safari[1]}`;
  }

  return ua.slice(0, 48);
}

function detectFrameworkInfo(element) {
  const reactInfo = detectReactInfo(element);
  if (reactInfo) {
    return reactInfo;
  }

  const vueInfo = detectVueInfo(element);
  if (vueInfo) {
    return vueInfo;
  }

  return null;
}

function detectReactInfo(element) {
  let current = element;

  while (current) {
    const fiber = findReactFiber(current);
    if (fiber) {
      const trail = buildReactComponentTrail(fiber).filter(Boolean);
      return {
        framework: "React",
        selectedComponent: trail[0] || "",
        componentTrail: trail.slice(0, 6)
      };
    }

    current = current.parentElement;
  }

  return null;
}

function findReactFiber(element) {
  for (const key of Object.keys(element)) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
      return element[key];
    }
  }

  return null;
}

function buildReactComponentTrail(fiber) {
  const trail = [];
  let current = fiber;

  while (current && trail.length < 6) {
    const name = getReactComponentName(current);
    if (name && !trail.includes(name)) {
      trail.push(name);
    }
    current = current.return;
  }

  return trail;
}

function getReactComponentName(fiber) {
  const type = fiber.elementType || fiber.type;
  if (!type) {
    return "";
  }

  if (typeof type === "string") {
    return type;
  }

  return type.displayName || type.name || "";
}

function detectVueInfo(element) {
  let current = element;

  while (current) {
    const instance = current.__vueParentComponent || current.__vue_app__?._instance || null;
    if (instance) {
      const trail = buildVueComponentTrail(instance).filter(Boolean);
      return {
        framework: "Vue",
        selectedComponent: trail[0] || "",
        componentTrail: trail.slice(0, 6)
      };
    }

    current = current.parentElement;
  }

  return null;
}

function detectDomTreeInfo(element) {
  const trail = buildDomComponentTrail(element);
  if (!trail.length) {
    return null;
  }

  return {
    framework: "DOM",
    selectedComponent: trail[0] || "",
    componentTrail: trail
  };
}

function buildDomComponentTrail(element) {
  const trail = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && trail.length < 5) {
    const label = describeDomNode(current);
    if (label && !trail.includes(label)) {
      trail.push(label);
    }
    current = current.parentElement;
  }

  return trail;
}

function describeDomNode(element) {
  const testId = normalizeWhitespace(element.getAttribute("data-testid") || "");
  if (testId) {
    return testId;
  }

  const aria = normalizeWhitespace(element.getAttribute("aria-label") || "");
  if (aria && aria.length <= 40) {
    return aria;
  }

  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).filter((name: string) => !/^active|selected|open|show$/.test(name)).slice(0, 2);
  if (classes.length) {
    return `${tag}.${classes.join(".")}`;
  }

  return tag;
}

function buildVueComponentTrail(instance) {
  const trail = [];
  let current = instance;

  while (current && trail.length < 6) {
    const name = getVueComponentName(current);
    if (name && !trail.includes(name)) {
      trail.push(name);
    }
    current = current.parent;
  }

  return trail;
}

function getVueComponentName(instance) {
  const type = instance.type || instance.vnode?.type;
  if (!type) {
    return "";
  }

  if (typeof type === "string") {
    return type;
  }

  return type.name || type.__name || instance.proxy?.$options?.name || "";
}

function buildSelector(element) {
  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }

    if (current.classList.length) {
      part += `.${Array.from(current.classList).slice(0, 2).map((item: string) => CSS.escape(item)).join(".")}`;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(" > ");
}

function buildXPath(element) {
  const segments = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tagName = current.tagName.toLowerCase();
    const parent = current.parentNode;
    if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
      segments.unshift(`/${tagName}`);
      break;
    }

    const siblings = Array.from((parent as Element).children).filter((child: Element) => child.tagName === current.tagName);
    const index = siblings.indexOf(current as Element) + 1;
    segments.unshift(`/${tagName}[${index}]`);
    current = parent;
  }

  return segments.join("");
}

function describeElement(element) {
  if (!element) {
    return "";
  }

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = element.classList.length ? `.${Array.from(element.classList).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${classes}`;
}

function extractValueSnippet(element) {
  if (!element) {
    return "";
  }

  if ("value" in element && typeof element.value === "string") {
    return element.value.slice(0, 80);
  }

  return normalizeWhitespace(element.textContent || "").slice(0, 80);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stringify(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function safeSendMessage(message) {
  try {
    if (!chrome.runtime?.id) {
      return;
    }

    const pending = chrome.runtime.sendMessage(message);
    if (pending && typeof pending.catch === "function") {
      pending.catch(() => {});
    }
  } catch (_error) {
    // Ignore stale content scripts after an extension reload/update.
  }
}
