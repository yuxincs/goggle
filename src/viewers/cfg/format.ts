import { CFGFunction, SourceRange } from "../../wasm/protocol.ts";
import { FormattedAnalysis } from "../lineMapping.ts";

const formatPosition = (line: number, column: number) => `${line}:${column}`;

const formatRange = (range: SourceRange) =>
  `${formatPosition(range.start.line, range.start.column)}-${formatPosition(range.end.line, range.end.column)}`;

export const formatCFGs = (functions: CFGFunction[]): FormattedAnalysis => {
  if (functions.length === 0) {
    return {
      content: "CFG unavailable, try adding function declarations to the source",
      sourceLines: [],
    };
  }

  const lines: string[] = [];
  const sourceLines: Array<number | null> = [];
  const append = (text: string, sourceLine: number | null) => {
    for (const [index, part] of text.split("\n").entries()) {
      lines.push(index === 0 ? part : `  ${part}`);
      sourceLines.push(sourceLine === null ? null : sourceLine + index);
    }
  };

  functions.forEach((fn, functionIndex) => {
    if (functionIndex > 0) {
      append("", null);
    }
    append(
      `func ${fn.name} [${formatRange(fn.range)}]${fn.noReturn ? " (no return)" : ""}`,
      fn.range.start.line,
    );
    for (const block of fn.blocks) {
      const blockLine = block.statement?.range.start.line ??
        block.nodes[0]?.range.start.line ??
        fn.range.start.line;
      append("", null);
      append(
        `block ${block.index} (${block.kind})${block.live ? "" : " [unreachable]"}`,
        blockLine,
      );
      if (block.statement !== undefined) {
        append(
          `  control: ${block.statement.type} [${formatRange(block.statement.range)}]`,
          block.statement.range.start.line,
        );
      }
      for (const node of block.nodes) {
        append(
          `  ${node.type} [${formatRange(node.range)}] ${node.source}`,
          node.range.start.line,
        );
      }
      append(
        `  successors: ${block.successors.length === 0 ? "none" : block.successors.join(", ")}`,
        blockLine,
      );
    }
  });

  return {
    content: lines.join("\n"),
    sourceLines,
  };
};
