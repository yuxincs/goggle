import { ASTNode, SourceRange } from "../../wasm/protocol.ts";
import { FormattedAnalysis } from "../shared/lineMapping.ts";

const formatPosition = (line: number, column: number) => `${line}:${column}`;

const formatRange = (range: SourceRange) =>
  `${formatPosition(range.start.line, range.start.column)}-${formatPosition(range.end.line, range.end.column)}`;

export const formatAST = (root: ASTNode): FormattedAnalysis => {
  const lines: string[] = [];
  const sourcePositions: FormattedAnalysis["sourcePositions"] = [];

  const visit = (node: ASTNode, depth: number, label?: string) => {
    const indentation = "  ".repeat(depth);
    const properties = Object.entries(node.properties ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(" ");
    const prefix = label === undefined ? "" : `${label}: `;
    lines.push(
      `${indentation}${prefix}${node.type} [${formatRange(node.range)}]${properties === "" ? "" : ` ${properties}`}`,
    );
    sourcePositions.push(node.range.start);

    for (const child of node.children ?? []) {
      const childLabel = child.index === undefined
        ? child.field
        : `${child.field}[${child.index}]`;
      visit(child.node, depth + 1, childLabel);
    }
  };

  visit(root, 0);
  return {
    content: lines.join("\n"),
    sourcePositions,
  };
};
