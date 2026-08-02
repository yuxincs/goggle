import { SourcePosition, SSAFunction } from "../../wasm/protocol.ts";
import { FormattedAnalysis } from "../lineMapping.ts";

const formatPosition = (position: SourcePosition) =>
  `${position.line}:${position.column}`;

export const formatSSA = (functions: SSAFunction[]): FormattedAnalysis => {
  if (functions.length === 0) {
    return {
      content: "SSA unavailable, try adding function declarations to the source",
      sourceLines: [],
    };
  }

  const lines: string[] = [];
  const sourceLines: Array<number | null> = [];
  const append = (text: string, sourceLine: number | null) => {
    lines.push(text);
    sourceLines.push(sourceLine);
  };

  functions.forEach((fn, functionIndex) => {
    if (functionIndex > 0) {
      append("", null);
    }
    const signature = fn.signature.startsWith("func")
      ? fn.signature.slice("func".length)
      : ` ${fn.signature}`;
    append(
      `func ${fn.name}${signature} [${formatPosition(fn.position)}]`,
      fn.position.line,
    );

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
      const blockLine = block.instructions.find((instruction) =>
        instruction.position !== undefined
      )?.position?.line ?? fn.position.line;
      append("", null);
      append(
        `block ${block.index}${comment}  predecessors: ${predecessors}  successors: ${successors}`,
        blockLine,
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
        append(
          `  ${instruction.index}: ${result}${instruction.text}${resultType}`,
          instruction.position?.line ?? blockLine,
        );
      }
    }
  });

  return {
    content: lines.join("\n"),
    sourceLines,
  };
};
