import { CFGFunction, SourceRange } from "../../analysis.ts";

const formatPosition = (line: number, column: number) => `${line}:${column}`;

const formatRange = (range: SourceRange) =>
  `${formatPosition(range.start.line, range.start.column)}-${formatPosition(range.end.line, range.end.column)}`;

const indentMultiline = (value: string, indentation: string) =>
  value.split("\n").join(`\n${indentation}`);

export const formatCFGs = (functions: CFGFunction[]): string => {
  if (functions.length === 0) {
    return "CFG unavailable, try adding function declarations to the source";
  }

  return functions.map((fn) => {
    const lines = [
      `func ${fn.name} [${formatRange(fn.range)}]${fn.noReturn ? " (no return)" : ""}`,
    ];

    for (const block of fn.blocks) {
      lines.push(
        "",
        `block ${block.index} (${block.kind})${block.live ? "" : " [unreachable]"}`,
      );
      if (block.statement !== undefined) {
        lines.push(
          `  control: ${block.statement.type} [${formatRange(block.statement.range)}]`,
        );
      }
      for (const node of block.nodes) {
        lines.push(
          `  ${node.type} [${formatRange(node.range)}] ${indentMultiline(node.source, "  ")}`,
        );
      }
      lines.push(
        `  successors: ${block.successors.length === 0 ? "none" : block.successors.join(", ")}`,
      );
    }

    return lines.join("\n");
  }).join("\n\n");
};
