import "../assets/wasm_exec.js";
import goggleWasm from "../assets/goggle.wasm?url";

let isGoggleWasmLoaded = false;

export const loadGoggleWasm = async () => {
  // Guard the load function such that we do not load the Go wasm module more than once.
  if (isGoggleWasmLoaded) {
    return;
  }
  isGoggleWasmLoaded = true;
  // @ts-expect-error: `Go` is imported in global this by `wasm_exec.js` file.
  const go = new Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch(goggleWasm),
    go.importObject
  );
  console.log("Go WebAssembly started");

  // Run the instance without waiting since Go Assembly would be running forever to provide the functionality.
  go.run(result.instance);
};
