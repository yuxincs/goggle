import { CFGFunction, SourceRange } from "../../wasm/protocol.ts";
import { AnalysisPosition, FormattedAnalysis } from "../shared/lineMapping.ts";

const formatPosition = (line: number, column: number) => `${line}:${column}`;

const formatRange = (range: SourceRange) =>
  `${formatPosition(range.start.line, range.start.column)}-${formatPosition(range.end.line, range.end.column)}`;

export const formatCFGs = (functions: CFGFunction[]): FormattedAnalysis => {
  if (functions.length === 0) {
    return {
      content: "CFG unavailable, try adding function declarations to the source",
      sourcePositions: [],
    };
  }

  const lines: string[] = [];
  const sourcePositions: FormattedAnalysis["sourcePositions"] = [];
  const append = (text: string, sourcePosition: AnalysisPosition | null) => {
    for (const [index, part] of text.split("\n").entries()) {
      lines.push(index === 0 ? part : `  ${part}`);
      sourcePositions.push(sourcePosition === null
        ? null
        : {
          line: sourcePosition.line + index,
          column: index === 0 ? sourcePosition.column : 1,
        });
    }
  };

  functions.forEach((fn, functionIndex) => {
    if (functionIndex > 0) {
      append("", null);
    }
    append(
      `func ${fn.name} [${formatRange(fn.range)}]${fn.noReturn ? " (no return)" : ""}`,
      fn.range.start,
    );
    for (const block of fn.blocks) {
      const blockPosition = block.statement?.range.start ??
        block.nodes[0]?.range.start ??
        fn.range.start;
      append("", null);
      append(
        `block ${block.index} (${block.kind})${block.live ? "" : " [unreachable]"}`,
        blockPosition,
      );
      if (block.statement !== undefined) {
        append(
          `  control: ${block.statement.type} [${formatRange(block.statement.range)}]`,
          block.statement.range.start,
        );
      }
      for (const node of block.nodes) {
        append(
          `  ${node.type} [${formatRange(node.range)}] ${node.source}`,
          node.range.start,
        );
      }
      append(
        `  successors: ${block.successors.length === 0 ? "none" : block.successors.join(", ")}`,
        blockPosition,
      );
    }
  });

  return {
    content: lines.join("\n"),
    sourcePositions,
  };
};
