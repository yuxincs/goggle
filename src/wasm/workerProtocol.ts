import type {
  IDERequestMap,
  IDEResultMap,
  WasmParseResult,
} from "./protocol.ts";

export interface WorkerRequestMap {
  initialize: undefined;
  analyze: { source: string };
  "ide/update": IDERequestMap["update"];
  "ide/completion": IDERequestMap["completion"];
  "ide/hover": IDERequestMap["hover"];
  "ide/definition": IDERequestMap["definition"];
  "ide/signatureHelp": IDERequestMap["signatureHelp"];
}

export interface WorkerResultMap {
  initialize: null;
  analyze: WasmParseResult;
  "ide/update": IDEResultMap["update"];
  "ide/completion": IDEResultMap["completion"];
  "ide/hover": IDEResultMap["hover"];
  "ide/definition": IDEResultMap["definition"];
  "ide/signatureHelp": IDEResultMap["signatureHelp"];
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
