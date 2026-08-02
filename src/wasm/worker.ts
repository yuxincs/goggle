/// <reference lib="webworker" />

import "./generated/wasm_exec.js";
import goggleWasm from "./generated/goggle.wasm?url";
import type {
  IDEMethod,
  IDERequestMap,
  IDEResultMap,
  WasmParseResult,
} from "./protocol.ts";
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

const requestIDE = async <Method extends IDEMethod>(
  method: Method,
  params: IDERequestMap[Method],
): Promise<IDEResultMap[Method]> => {
  await loadGoggleWasm();
  const response = globalThis.ide?.(JSON.stringify({ method, params }));
  if (response === undefined) {
    throw new Error("Go WebAssembly IDE service is unavailable");
  }
  if (response.error !== undefined) {
    throw new Error(response.error);
  }
  return JSON.parse(response.body) as IDEResultMap[Method];
};

const execute = (request: WorkerRequest): Promise<unknown> => {
  switch (request.method) {
    case "initialize":
      return loadGoggleWasm().then(() => null);
    case "analyze":
      return analyze(request.params.source);
    case "ide/update":
      return requestIDE("update", request.params);
    case "ide/completion":
      return requestIDE("completion", request.params);
    case "ide/hover":
      return requestIDE("hover", request.params);
    case "ide/definition":
      return requestIDE("definition", request.params);
    case "ide/signatureHelp":
      return requestIDE("signatureHelp", request.params);
  }
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  void (async () => {
    try {
      const result = await execute(request);
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
