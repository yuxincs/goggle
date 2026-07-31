export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface ASTChild {
  field: string;
  index?: number;
  node: ASTNode;
}

export interface ASTNode {
  type: string;
  range: SourceRange;
  properties?: Record<string, string>;
  children?: ASTChild[];
}

export interface SyntaxNode {
  type: string;
  range: SourceRange;
  source: string;
}

export interface CFGBlock {
  index: number;
  kind: string;
  live: boolean;
  statement?: SyntaxNode;
  nodes: SyntaxNode[];
  successors: number[];
}

export interface CFGFunction {
  name: string;
  range: SourceRange;
  noReturn: boolean;
  blocks: CFGBlock[];
}

export interface SSAValue {
  name: string;
  type: string;
  text: string;
}

export interface SSAInstruction {
  index: number;
  opcode: string;
  text: string;
  position?: SourcePosition;
  result?: SSAValue;
  operands: SSAValue[];
}

export interface SSABlock {
  index: number;
  comment?: string;
  predecessors: number[];
  successors: number[];
  instructions: SSAInstruction[];
}

export interface SSAFunction {
  name: string;
  signature: string;
  position: SourcePosition;
  parameters: SSAValue[];
  blocks: SSABlock[];
}

export interface AnalysisResult {
  ast: ASTNode;
  cfgs: CFGFunction[];
  ssa: SSAFunction[];
}

const formatPosition = (position: SourcePosition) =>
  `${position.line}:${position.column}`;

const formatRange = (range: SourceRange) =>
  `${formatPosition(range.start)}-${formatPosition(range.end)}`;

const indentMultiline = (value: string, indentation: string) =>
  value.split("\n").join(`\n${indentation}`);

export const formatAST = (root: ASTNode): string => {
  const lines: string[] = [];

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

    for (const child of node.children ?? []) {
      const childLabel = child.index === undefined
        ? child.field
        : `${child.field}[${child.index}]`;
      visit(child.node, depth + 1, childLabel);
    }
  };

  visit(root, 0);
  return lines.join("\n");
};

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

export const formatSSA = (functions: SSAFunction[]): string => {
  if (functions.length === 0) {
    return "SSA unavailable, try adding function declarations to the source";
  }

  return functions.map((fn) => {
    const signature = fn.signature.startsWith("func")
      ? fn.signature.slice("func".length)
      : ` ${fn.signature}`;
    const lines = [
      `func ${fn.name}${signature} [${formatPosition(fn.position)}]`,
    ];

    for (const block of fn.blocks) {
      const comment = block.comment === "" || block.comment === undefined
        ? ""
        : ` (${block.comment})`;
      const predecessors = block.predecessors.length === 0
        ? "none"
        : block.predecessors.join(", ");
      const successors = block.successors.length === 0
        ? "none"
        : block.successors.join(", ");
      lines.push(
        "",
        `block ${block.index}${comment}  predecessors: ${predecessors}  successors: ${successors}`,
      );

      for (const instruction of block.instructions) {
        const result = instruction.result?.name === undefined ||
            instruction.result.name === ""
          ? ""
          : `${instruction.result.name} = `;
        const resultType = instruction.result?.type === undefined ||
            instruction.result.type === ""
          ? ""
          : `  // ${instruction.result.type}`;
        lines.push(
          `  ${instruction.index}: ${result}${instruction.text}${resultType}`,
        );
      }
    }

    return lines.join("\n");
  }).join("\n\n");
};
