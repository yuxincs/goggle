import "../assets/wasm_exec.js";
import goggleWasm from "../assets/goggle.wasm?url";

const PARSER_TIMEOUT = 30_000;
let loadPromise: Promise<void> | undefined;

const isParserReady = () => {
  // @ts-expect-error: `parse` is injected into global this by the Goggle WebAssembly module.
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

  // @ts-expect-error: `Go` is imported in global this by `wasm_exec.js` file.
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
