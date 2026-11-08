import type { EngineReport } from "./engine-types";

type EngineInstance = {
  startGame: (override?: Record<string, unknown>) => Promise<unknown>;
};

type EngineCtor = {
  new (config: Record<string, unknown>): EngineInstance;
  getMissingFeatures?: (features?: { threads?: boolean }) => string[];
};

declare global {
  interface Window {
    Engine?: EngineCtor;
    sfReady?: boolean;
    sfPending?: string;
    sfLast?: string;
  }
}

export type GodotHooks = {
  onLine?: (line: string) => void;
  onProgress?: (loaded: number, total: number) => void;
};

let bootPromise: Promise<void> | null = null;
let lineListener: (line: string) => void = () => {};
let progressListener: (loaded: number, total: number) => void = () => {};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function godotRoot(): string {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/godot/engine/index`;
}

function ensureCanvas(): HTMLCanvasElement {
  const existing = document.getElementById("sf-godot-canvas");
  if (existing instanceof HTMLCanvasElement) return existing;
  const canvas = document.createElement("canvas");
  canvas.id = "sf-godot-canvas";
  canvas.width = 256;
  canvas.height = 256;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;left:0;top:0;width:8px;height:8px;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(canvas);
  return canvas;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-sf-godot="1"]`);
    if (existing) {
      if (window.Engine) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load the Godot engine.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.sfGodot = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the Godot engine."));
    document.body.appendChild(script);
  });
}

function ensureBoot(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = boot().catch((error) => {
    bootPromise = null;
    throw error;
  });
  return bootPromise;
}

async function boot(): Promise<void> {
  const root = godotRoot();
  await loadScript(`${root}.js`);
  const Engine = window.Engine;
  if (!Engine) throw new Error("Godot did not register its engine.");
  const missing = Engine.getMissingFeatures?.({ threads: false }) ?? [];
  if (missing.length > 0) {
    throw new Error(missing.join(" "));
  }
  const canvas = ensureCanvas();
  const engine = new Engine({
    executable: root,
    canvas,
    canvasResizePolicy: 0,
    focusCanvas: false,
    args: [],
    fileSizes: { [`${root}.pck`]: 19712, [`${root}.wasm`]: 35376909 },
    onPrint: (...args: unknown[]) => {
      lineListener(args.map((part) => String(part)).join(" "));
    },
    onPrintError: (...args: unknown[]) => {
      lineListener(args.map((part) => String(part)).join(" "));
    },
    onProgress: (loaded: number, total: number) => {
      progressListener(loaded, total);
    },
  });
  let startError: Error | null = null;
  const started = engine.startGame().catch((error: unknown) => {
    startError = error instanceof Error ? error : new Error(String(error));
  });
  const deadline = Date.now() + 90000;
  while (!window.sfReady) {
    if (startError) throw startError;
    if (Date.now() > deadline) {
      throw new Error("Godot started but the GDScript host did not report ready.");
    }
    await sleep(40);
  }
  void started;
}

export async function runGodot(payload: unknown, hooks: GodotHooks = {}): Promise<EngineReport> {
  const previous = lineListener;
  const previousProgress = progressListener;
  lineListener = (line) => {
    previous(line);
    hooks.onLine?.(line);
  };
  progressListener = (loaded, total) => {
    previousProgress(loaded, total);
    hooks.onProgress?.(loaded, total);
  };
  try {
    await ensureBoot();
    const before = window.sfLast ?? "";
    let captured: string | null = null;
    const hear = lineListener;
    lineListener = (line) => {
      hear(line);
      if (line.startsWith("SF_JSON ")) captured = line;
    };
    window.sfPending = JSON.stringify(payload);
    const deadline = Date.now() + 20000;
    while (!captured && (!window.sfLast || window.sfLast === before)) {
      if (Date.now() > deadline) throw new Error("The engine did not return a verdict.");
      await sleep(30);
    }
    const line = captured ?? window.sfLast ?? "";
    if (!line.startsWith("SF_JSON ")) throw new Error("The engine reply was not a sealed report.");
    return JSON.parse(line.slice("SF_JSON ".length)) as EngineReport;
  } finally {
    lineListener = previous;
    progressListener = previousProgress;
  }
}
