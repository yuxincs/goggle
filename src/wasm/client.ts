import "./generated/wasm_exec.js";
import goggleWasm from "./generated/goggle.wasm?url";
import type { WasmParseResult } from "./protocol.ts";

const PARSER_TIMEOUT = 30_000;
let loadPromise: Promise<void> | undefined;

const isParserReady = () => {
  return typeof globalThis.parse === "function";
};

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
    window.setTimeout(check, 10);
  };

  check();
});

const initializeGoggleWasm = async () => {
  if (isParserReady()) {
    return;
  }

  const go = new Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch(goggleWasm),
    go.importObject
  );
  console.log("Go WebAssembly started");

  // Run the instance without waiting since Go Assembly would be running forever to provide the functionality.
  void go.run(result.instance);
  await waitForParser();
};

export const loadGoggleWasm = () => {
  if (loadPromise === undefined) {
    loadPromise = initializeGoggleWasm().catch((error) => {
      loadPromise = undefined;
      throw error;
    });
  }
  return loadPromise;
};

export const parseGoSource = (source: string): WasmParseResult | undefined => {
  return globalThis.parse?.(source);
};
