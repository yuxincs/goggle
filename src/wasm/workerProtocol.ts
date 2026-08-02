import type { WasmParseResult } from "./protocol.ts";

export interface WorkerRequestMap {
  initialize: undefined;
  analyze: { source: string };
}

export interface WorkerResultMap {
  initialize: null;
  analyze: WasmParseResult;
}

export type WorkerMethod = keyof WorkerRequestMap;

export type WorkerRequest = {
  [Method in WorkerMethod]: {
    id: number;
    method: Method;
    params: WorkerRequestMap[Method];
  };
}[WorkerMethod];

export type WorkerResponse =
  | { id: number; result: unknown; error?: undefined }
  | { id: number; result?: undefined; error: string };
