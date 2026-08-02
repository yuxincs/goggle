import type {
  IDEDocument,
  IDEDocumentPosition,
  IDEHover,
  IDELocation,
  IDECompletionList,
  IDESignatureHelp,
  WasmParseResult,
} from "./protocol.ts";
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

export const updateIDEDocument = (document: IDEDocument): Promise<null> =>
  request("ide/update", document);

export const completeGo = (
  params: IDEDocumentPosition,
): Promise<IDECompletionList> => request("ide/completion", params);

export const hoverGo = (
  params: IDEDocumentPosition,
): Promise<IDEHover | null> => request("ide/hover", params);

export const defineGo = (
  params: IDEDocumentPosition,
): Promise<IDELocation | null> => request("ide/definition", params);

export const signatureHelpGo = (
  params: IDEDocumentPosition,
): Promise<IDESignatureHelp | null> => request("ide/signatureHelp", params);
