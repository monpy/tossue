export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Viewport = {
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type FrameworkInfo = {
  framework: "React" | "Vue" | "DOM";
  selectedComponent: string;
  componentTrail: string[];
};

export type SelectedArea = {
  url: string;
  pageTitle: string;
  browser: string;
  selector: string;
  xpath: string;
  tagName: string;
  id: string;
  classes: string[];
  role: string;
  ariaLabel: string;
  textSnippet: string;
  rect: Rect;
  framework: FrameworkInfo | null;
  viewport: Viewport;
};

export type CaptureRect = {
  rect: Rect;
  viewport: Viewport;
  capturedAt: number;
  url: string;
};

export type UserAction = {
  id: string;
  kind: "event" | "navigation";
  type: string;
  at: string;
  target: string;
  valueSnippet: string;
  targetInfo: SelectedArea | null;
  href?: string;
  navigationKind?: string;
};

export type ConsoleEntry = {
  level: "error" | "warn";
  message: string;
  at: string;
};

export type NetworkEntry = {
  method: string;
  url: string;
  status: number;
  at: string;
  error?: string;
};

export type IssueDraft = {
  repo: string;
  summary: string;
  currentBehavior: string;
  expectedBehavior: string;
  labels: string[];
};

export type TabState = {
  selectedArea: SelectedArea | null;
  captureRect: CaptureRect | null;
  actions: UserAction[];
  actionHistoryPast: UserAction[][];
  actionHistoryFuture: UserAction[][];
  consoleEntries: ConsoleEntry[];
  networkEntries: NetworkEntry[];
  screenshotDataUrl: string;
  draft: IssueDraft;
};

export type HelperHealth = {
  ok: boolean;
  port: number;
};

export type HelperGitHubStatus = {
  gh_installed: boolean;
  authenticated: boolean;
  login?: string;
  name?: string;
  error?: string;
};

export type HelperRepository = {
  name_with_owner: string;
};

export type HelperState = {
  reachable: boolean;
  health: HelperHealth | null;
  github: HelperGitHubStatus | null;
  repositories: HelperRepository[];
};

export type RecordingState = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  objectUrl: string;
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  framePending: Promise<void>;
};

export type IssueOptions = {
  includeActions: boolean;
};
