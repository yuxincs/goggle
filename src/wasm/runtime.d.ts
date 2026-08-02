import type { WasmParseResult } from "./protocol.ts";

declare global {
  interface GoRuntime {
    importObject: WebAssembly.Imports;
    run(instance: WebAssembly.Instance): Promise<void>;
  }

  var Go: {
    new (): GoRuntime;
  };

  var parse: ((source: string) => WasmParseResult) | undefined;
  var ide: ((request: string) => WasmParseResult) | undefined;
}

export {};
