import { languages, Range, Uri, type editor } from "monaco-editor";
import type {
  IDECompletionKind,
  IDEDocumentPosition,
  IDERange,
} from "../wasm/protocol.ts";
import {
  completeGo,
  defineGo,
  hoverGo,
  signatureHelpGo,
  updateIDEDocument,
} from "../wasm/client.ts";

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
    languages.registerDefinitionProvider(selector, {
      provideDefinition: async (model, position, token) => {
        if (model.uri.toString() !== GO_SOURCE_URI) return null;

        await synchronizeDocument(model);
        if (token.isCancellationRequested) return null;

        const definition = await defineGo(documentPosition(model, position));
        if (definition === null || token.isCancellationRequested) return null;

        return {
          uri: Uri.parse(definition.uri),
          range: toMonacoRange(definition.range),
        };
      },
    }),
    languages.registerSignatureHelpProvider(selector, {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [","],
      provideSignatureHelp: async (model, position, token) => {
        if (model.uri.toString() !== GO_SOURCE_URI) return null;

        await synchronizeDocument(model);
        if (token.isCancellationRequested) return null;

        const help = await signatureHelpGo(documentPosition(model, position));
        if (help === null || token.isCancellationRequested) return null;

        return {
          value: {
            signatures: help.signatures.map((signature) => ({
              label: signature.label,
              documentation: signature.documentation,
              parameters: signature.parameters.map((parameter) => ({
                label: parameter.label,
                documentation: parameter.documentation,
              })),
            })),
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
          },
          dispose: () => {},
        };
      },
    }),
  ];

  return {
    dispose: () => providers.forEach((provider) => provider.dispose()),
  };
};
