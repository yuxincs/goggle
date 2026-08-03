export interface AnalysisPosition {
  line: number;
  column: number;
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

const utf8Encoder = new TextEncoder();

const sourceLine = (source: string, line: number) =>
  (source.split("\n")[line - 1] ?? "").replace(/\r$/, "");

export const analysisPositionForEditorPosition = (
  source: string,
  position: EditorPosition,
): AnalysisPosition => {
  const prefix = sourceLine(source, position.lineNumber).slice(0, position.column - 1);
  return {
    line: position.lineNumber,
    column: utf8Encoder.encode(prefix).length + 1,
  };
};

export const editorPositionForAnalysisPosition = (
  source: string,
  position: AnalysisPosition,
): EditorPosition => {
  const line = sourceLine(source, position.line);
  const targetByteOffset = Math.max(0, position.column - 1);
  let byteOffset = 0;
  let utf16Offset = 0;
  for (const character of line) {
    const characterBytes = utf8Encoder.encode(character).length;
    if (byteOffset + characterBytes > targetByteOffset) break;
    byteOffset += characterBytes;
    utf16Offset += character.length;
  }
  return {
    lineNumber: position.line,
    column: utf16Offset + 1,
  };
};

export interface FormattedAnalysis {
  content: string;
  sourcePositions: Array<AnalysisPosition | null>;
}

export const sourcePositionForDisplayLine = (
  sourcePositions: Array<AnalysisPosition | null>,
  displayLine: number,
): AnalysisPosition | undefined => {
  const index = displayLine - 1;
  const direct = sourcePositions[index];
  if (direct !== undefined && direct !== null) {
    return direct;
  }

  for (let distance = 1; distance < sourcePositions.length; distance++) {
    const before = sourcePositions[index - distance];
    if (before !== undefined && before !== null) {
      return before;
    }
    const after = sourcePositions[index + distance];
    if (after !== undefined && after !== null) {
      return after;
    }
  }

  return undefined;
};

export const displayLineForSourcePosition = (
  sourcePositions: Array<AnalysisPosition | null>,
  sourcePosition: AnalysisPosition,
): number | undefined => {
  let closestIndex: number | undefined;
  let closestLineDistance = Number.POSITIVE_INFINITY;
  let closestColumnDistance = Number.POSITIVE_INFINITY;

  sourcePositions.forEach((candidate, index) => {
    if (candidate === null) {
      return;
    }
    const lineDistance = Math.abs(candidate.line - sourcePosition.line);
    const columnDistance = Math.abs(candidate.column - sourcePosition.column);
    if (
      lineDistance < closestLineDistance ||
      (lineDistance === closestLineDistance && columnDistance < closestColumnDistance)
    ) {
      closestIndex = index;
      closestLineDistance = lineDistance;
      closestColumnDistance = columnDistance;
    }
  });

  return closestIndex === undefined ? undefined : closestIndex + 1;
};
