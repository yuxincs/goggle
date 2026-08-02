/// <reference lib="webworker" />

import "./generated/wasm_exec.js";
import goggleWasm from "./generated/goggle.wasm?url";
import type { WasmParseResult } from "./protocol.ts";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol.ts";

const PARSER_TIMEOUT = 30_000;
let loadPromise: Promise<void> | undefined;

const isParserReady = () => typeof globalThis.parse === "function";

const waitForParser = () => new Promise<void>((resolve, reject) => {
  const deadline = performance.now() + PARSER_TIMEOUT;

  const check = () => {
    if (isParserReady()) {
      resolve();
      return;
    }
    if (performance.now() >= deadline) {
      reject(new Error("Go WebAssembly parser initialization timed out"));
      return;
    }
    setTimeout(check, 10);
  };

  check();
});

const initializeGoggleWasm = async () => {
  if (isParserReady()) return;

  const go = new Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch(goggleWasm),
    go.importObject,
  );

  // The Go program deliberately runs forever while it serves requests.
  void go.run(result.instance);
  await waitForParser();
};

const loadGoggleWasm = () => {
  if (loadPromise === undefined) {
    loadPromise = initializeGoggleWasm().catch((error) => {
      loadPromise = undefined;
      throw error;
    });
  }
  return loadPromise;
};

const analyze = async (source: string): Promise<WasmParseResult> => {
  await loadGoggleWasm();
  const result = globalThis.parse?.(source);
  if (result === undefined) {
    throw new Error("Go WebAssembly parser is unavailable");
  }
  return result;
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  void (async () => {
    try {
      const result = request.method === "initialize"
        ? await loadGoggleWasm().then(() => null)
        : await analyze(request.params.source);
      const response: WorkerResponse = { id: request.id, result };
      self.postMessage(response);
    } catch (error: unknown) {
      const response: WorkerResponse = {
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  })();
});
