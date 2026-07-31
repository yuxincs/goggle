import { SourcePosition, SSAFunction } from "../../analysis.ts";

const formatPosition = (position: SourcePosition) =>
  `${position.line}:${position.column}`;

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
