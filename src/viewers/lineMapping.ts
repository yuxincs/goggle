export interface FormattedAnalysis {
  content: string;
  sourceLines: Array<number | null>;
}

export const sourceLineForDisplayLine = (
  sourceLines: Array<number | null>,
  displayLine: number,
): number | undefined => {
  const index = displayLine - 1;
  const direct = sourceLines[index];
  if (direct !== undefined && direct !== null) {
    return direct;
  }

  for (let distance = 1; distance < sourceLines.length; distance++) {
    const before = sourceLines[index - distance];
    if (before !== undefined && before !== null) {
      return before;
    }
    const after = sourceLines[index + distance];
    if (after !== undefined && after !== null) {
      return after;
    }
  }

  return undefined;
};

export const displayLineForSourceLine = (
  sourceLines: Array<number | null>,
  sourceLine: number,
): number | undefined => {
  let closestIndex: number | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  sourceLines.forEach((candidate, index) => {
    if (candidate === null) {
      return;
    }
    const distance = Math.abs(candidate - sourceLine);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });

  return closestIndex === undefined ? undefined : closestIndex + 1;
};
