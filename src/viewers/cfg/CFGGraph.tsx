import { useMemo, useState } from "react";
import { CFGBlock, CFGFunction } from "../../wasm/protocol.ts";

interface CFGGraphProps {
  functions: CFGFunction[];
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
}

interface PositionedBlock {
  block: CFGBlock;
  x: number;
  y: number;
}

const CARD_WIDTH = 184;
const CARD_HEIGHT = 106;
const COLUMN_GAP = 34;
const ROW_GAP = 58;
const CANVAS_PADDING = 24;

const functionForLine = (functions: CFGFunction[], line: number) => {
  const index = functions.findIndex((fn) =>
    fn.range.start.line <= line && fn.range.end.line >= line
  );
  return index < 0 ? 0 : index;
};

const blockLine = (block: CFGBlock, fallback: number) =>
  block.nodes[0]?.range.start.line ?? block.statement?.range.start.line ?? fallback;

const blockContainsLine = (block: CFGBlock, line: number) => {
  const nodes = [block.statement, ...block.nodes].filter((node) => node !== undefined);
  return nodes.some((node) => node.range.start.line <= line && node.range.end.line >= line);
};

const layoutBlocks = (fn: CFGFunction) => {
  const byIndex = new Map(fn.blocks.map((block) => [block.index, block]));
  const levels = new Map<number, number>();
  const first = fn.blocks.find((block) => block.live) ?? fn.blocks[0];
  const queue = first === undefined ? [] : [first.index];
  if (first !== undefined) levels.set(first.index, 0);

  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined) break;
    const level = levels.get(index) ?? 0;
    for (const successor of byIndex.get(index)?.successors ?? []) {
      if (!levels.has(successor)) {
        levels.set(successor, level + 1);
        queue.push(successor);
      }
    }
  }

  const lastLevel = Math.max(0, ...levels.values()) + 1;
  for (const block of fn.blocks) {
    if (!levels.has(block.index)) levels.set(block.index, lastLevel);
  }

  const layers = new Map<number, CFGBlock[]>();
  for (const block of fn.blocks) {
    const level = levels.get(block.index) ?? 0;
    layers.set(level, [...(layers.get(level) ?? []), block]);
  }

  const widestLayer = Math.max(1, ...[...layers.values()].map((blocks) => blocks.length));
  const width = Math.max(
    440,
    CANVAS_PADDING * 2 + widestLayer * CARD_WIDTH + (widestLayer - 1) * COLUMN_GAP,
  );
  const height = CANVAS_PADDING * 2 + layers.size * CARD_HEIGHT +
    Math.max(0, layers.size - 1) * ROW_GAP;
  const positioned: PositionedBlock[] = [];

  for (const [level, blocks] of [...layers.entries()].sort(([left], [right]) => left - right)) {
    const rowWidth = blocks.length * CARD_WIDTH + (blocks.length - 1) * COLUMN_GAP;
    const startX = (width - rowWidth) / 2;
    blocks.forEach((block, index) => positioned.push({
      block,
      x: startX + index * (CARD_WIDTH + COLUMN_GAP),
      y: CANVAS_PADDING + level * (CARD_HEIGHT + ROW_GAP),
    }));
  }

  return { width, height, positioned };
};

export const CFGGraph = (props: CFGGraphProps) => {
  const [selection, setSelection] = useState(() => ({
    index: functionForLine(props.functions, props.sourceLine),
    sourceLine: props.sourceLine,
  }));
  const selectedFunction = selection.sourceLine === props.sourceLine
    ? selection.index
    : functionForLine(props.functions, props.sourceLine);
  const functionIndex = Math.min(selectedFunction, Math.max(0, props.functions.length - 1));
  const fn = props.functions[functionIndex];
  const layout = useMemo(() => fn === undefined ? null : layoutBlocks(fn), [fn]);
  const positions = new Map(layout?.positioned.map((item) => [item.block.index, item]) ?? []);

  if (fn === undefined || layout === null) {
    return <div className="analysis-placeholder">Add a function to see its control flow.</div>;
  }

  return (
    <div className="analysis-visual analysis-visual--with-toolbar">
      <div className="analysis-toolbar">
        <label>
          <span>Function</span>
          <select
            value={functionIndex}
            onChange={(event) => setSelection({
              index: Number(event.target.value),
              sourceLine: props.sourceLine,
            })}
          >
            {props.functions.map((candidate, index) => (
              <option key={`${candidate.name}-${candidate.range.start.offset}`} value={index}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <span className="analysis-toolbar__meta">
          {fn.blocks.filter((block) => block.live).length} live · {fn.blocks.length} blocks
        </span>
      </div>
      <div className="cfg-viewport">
        <div className="cfg-canvas" style={{ width: layout.width, height: layout.height }}>
          <svg className="cfg-edges" width={layout.width} height={layout.height} aria-hidden="true">
            <defs>
              <marker id="cfg-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" />
              </marker>
            </defs>
            {layout.positioned.flatMap(({ block, x, y }) =>
              block.successors.map((successor) => {
                const target = positions.get(successor);
                if (target === undefined) return null;
                const startX = x + CARD_WIDTH / 2;
                const startY = y + CARD_HEIGHT;
                const endX = target.x + CARD_WIDTH / 2;
                const endY = target.y;
                const middleY = startY + (endY - startY) / 2;
                const path = endY > startY
                  ? `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`
                  : `M ${startX} ${startY} C ${layout.width - 10} ${startY + 18}, ${layout.width - 10} ${endY - 18}, ${endX} ${endY}`;
                return <path key={`${block.index}-${successor}`} d={path} markerEnd="url(#cfg-arrow)" />;
              })
            )}
          </svg>
          {layout.positioned.map(({ block, x, y }) => {
            const source = block.nodes.map((node) => node.source).join("; ") ||
              block.statement?.source || "Empty block";
            const active = blockContainsLine(block, props.sourceLine);
            return (
              <button
                type="button"
                key={block.index}
                className={`cfg-card${block.live ? "" : " cfg-card--unreachable"}${active ? " cfg-card--active" : ""}`}
                style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
                onClick={() => props.onSourceLineSelect(blockLine(block, fn.range.start.line))}
              >
                <span className="cfg-card__header">
                  <strong>B{block.index}</strong>
                  <span>{block.kind}</span>
                </span>
                <span className="cfg-card__source">{source.replace(/\s+/g, " ").trim()}</span>
                <span className="cfg-card__footer">
                  {block.successors.length === 0
                    ? "exit"
                    : block.successors.map((successor) => `B${successor}`).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
