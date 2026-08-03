import { SSAFunction, SSAInstruction } from "../../wasm/protocol.ts";
import { AnalysisPosition } from "../shared/lineMapping.ts";

export const analysisPositionKey = (position: AnalysisPosition) =>
  `${position.line}:${position.column}`;

const positionDistance = (
  candidate: AnalysisPosition,
  target: AnalysisPosition,
) => ({
  line: Math.abs(candidate.line - target.line),
  column: Math.abs(candidate.column - target.column),
});

const isCloser = (
  candidate: ReturnType<typeof positionDistance>,
  closest: ReturnType<typeof positionDistance>,
) => candidate.line < closest.line ||
  (candidate.line === closest.line && candidate.column < closest.column);

export const functionForPosition = (
  functions: SSAFunction[],
  position: AnalysisPosition,
) => {
  let closestIndex = 0;
  let closestDistance = { line: Number.POSITIVE_INFINITY, column: Number.POSITIVE_INFINITY };
  functions.forEach((fn, index) => {
    const positions = [
      fn.position,
      ...fn.blocks.flatMap((block) =>
        block.instructions.flatMap((instruction) =>
          instruction.position === undefined ? [] : [instruction.position]
        )
      ),
    ];
    const distance = positions
      .map((candidate) => positionDistance(candidate, position))
      .reduce((closest, candidate) => isCloser(candidate, closest) ? candidate : closest);
    if (isCloser(distance, closestDistance)) {
      closestIndex = index;
      closestDistance = distance;
    }
  });
  return closestIndex;
};

export interface ClosestSSAInstruction {
  blockIndex: number;
  instruction: SSAInstruction;
}

export const closestInstructionForPosition = (
  fn: SSAFunction,
  position: AnalysisPosition,
): ClosestSSAInstruction | null => {
  let closest: ClosestSSAInstruction | null = null;
  let closestDistance = { line: Number.POSITIVE_INFINITY, column: Number.POSITIVE_INFINITY };
  for (const block of fn.blocks) {
    for (const instruction of block.instructions) {
      if (instruction.position === undefined) continue;
      const distance = positionDistance(instruction.position, position);
      if (isCloser(distance, closestDistance)) {
        closest = { blockIndex: block.index, instruction };
        closestDistance = distance;
      }
    }
  }
  return closest;
};
