import { languages, Range, type editor } from "monaco-editor";
import type {
  IDECompletionKind,
  IDEDocumentPosition,
  IDERange,
} from "../wasm/protocol.ts";
import { completeGo, hoverGo, updateIDEDocument } from "../wasm/client.ts";

export const GO_SOURCE_URI = "file:///main.go";

const completionKinds: Record<
  IDECompletionKind,
  languages.CompletionItemKind
> = {
  constant: languages.CompletionItemKind.Constant,
  field: languages.CompletionItemKind.Field,
  function: languages.CompletionItemKind.Function,
  keyword: languages.CompletionItemKind.Keyword,
  method: languages.CompletionItemKind.Method,
  package: languages.CompletionItemKind.Module,
  type: languages.CompletionItemKind.Class,
  variable: languages.CompletionItemKind.Variable,
};

const toMonacoRange = (range: IDERange) => new Range(
  range.start.line + 1,
  range.start.character + 1,
  range.end.line + 1,
  range.end.character + 1,
);

const synchronizeDocument = async (model: editor.ITextModel) => {
  await updateIDEDocument({
    uri: model.uri.toString(),
    source: model.getValue(),
    version: model.getVersionId(),
  });
};

const documentPosition = (
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
): IDEDocumentPosition => ({
  uri: model.uri.toString(),
  version: model.getVersionId(),
  position: {
    line: position.lineNumber - 1,
    character: position.column - 1,
  },
});

export const registerGoIDE = () => {
  const selector = { language: "go", scheme: "file" };
  const providers = [
    languages.registerCompletionItemProvider(selector, {
      triggerCharacters: ["."],
      provideCompletionItems: async (model, position, _context, token) => {
        if (model.uri.toString() !== GO_SOURCE_URI) {
          return { suggestions: [] };
        }

        await synchronizeDocument(model);
        if (token.isCancellationRequested) return { suggestions: [] };

        const completion = await completeGo(documentPosition(model, position));
        if (token.isCancellationRequested) return { suggestions: [] };

        return {
          suggestions: completion.items.map((item) => ({
            label: item.label,
            detail: item.detail,
            insertText: item.insertText,
            kind: completionKinds[item.kind],
            range: toMonacoRange(item.replace),
          })),
        };
      },
    }),
    languages.registerHoverProvider(selector, {
      provideHover: async (model, position, token) => {
        if (model.uri.toString() !== GO_SOURCE_URI) return null;

        await synchronizeDocument(model);
        if (token.isCancellationRequested) return null;

        const hover = await hoverGo(documentPosition(model, position));
        if (hover === null || token.isCancellationRequested) return null;

        return {
          contents: [{ value: `\`\`\`go\n${hover.contents}\n\`\`\`` }],
          range: hover.range === undefined
            ? undefined
            : toMonacoRange(hover.range),
        };
      },
    }),
  ];

  return {
    dispose: () => providers.forEach((provider) => provider.dispose()),
  };
};
