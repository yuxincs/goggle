import type { WasmParseResult } from "./protocol.ts";
import type {
  WorkerMethod,
  WorkerRequest,
  WorkerRequestMap,
  WorkerResponse,
  WorkerResultMap,
} from "./workerProtocol.ts";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
const pendingRequests = new Map<
  number,
  { resolve: (result: unknown) => void; reject: (error: Error) => void }
>();
let nextRequestID = 1;

worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;
  const pending = pendingRequests.get(response.id);
  if (pending === undefined) return;

  pendingRequests.delete(response.id);
  if (response.error !== undefined) {
    pending.reject(new Error(response.error));
  } else {
    pending.resolve(response.result);
  }
});

worker.addEventListener("error", (event) => {
  const error = new Error(event.message || "Go WebAssembly worker failed");
  for (const pending of pendingRequests.values()) pending.reject(error);
  pendingRequests.clear();
});

const request = <Method extends WorkerMethod>(
  method: Method,
  params: WorkerRequestMap[Method],
) => {
  const id = nextRequestID++;
  const message = { id, method, params } as WorkerRequest;
  return new Promise<WorkerResultMap[Method]>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (result) => resolve(result as WorkerResultMap[Method]),
      reject,
    });
    worker.postMessage(message);
  });
};

export const loadGoggleWasm = async () => {
  await request("initialize", undefined);
};

export const parseGoSource = (source: string): Promise<WasmParseResult> =>
  request("analyze", { source });
