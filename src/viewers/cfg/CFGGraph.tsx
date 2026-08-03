import { useMemo, useState } from "react";
import { CFGBlock, CFGFunction } from "../../wasm/protocol.ts";
import { GraphViewport } from "../shared/GraphViewport.tsx";
import { AnalysisPosition } from "../shared/lineMapping.ts";

interface CFGGraphProps {
  functions: CFGFunction[];
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
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

const comparePosition = (left: AnalysisPosition, right: AnalysisPosition) =>
  left.line === right.line ? left.column - right.column : left.line - right.line;

const rangeContainsPosition = (
  start: AnalysisPosition,
  end: AnalysisPosition,
  position: AnalysisPosition,
) => comparePosition(start, position) <= 0 && comparePosition(position, end) <= 0;

const positionKey = (position: AnalysisPosition) => `${position.line}:${position.column}`;

const functionForPosition = (functions: CFGFunction[], position: AnalysisPosition) => {
  const index = functions.findIndex((fn) =>
    rangeContainsPosition(fn.range.start, fn.range.end, position)
  );
  return index < 0 ? 0 : index;
};

const blockPosition = (block: CFGBlock, fallback: AnalysisPosition) =>
  block.nodes[0]?.range.start ?? block.statement?.range.start ?? fallback;

const blockForPosition = (fn: CFGFunction, position: AnalysisPosition) => {
  let closest: { index: number; width: number; live: boolean } | null = null;
  for (const block of fn.blocks) {
    for (const node of [...block.nodes, block.statement].filter((item) => item !== undefined)) {
      if (!rangeContainsPosition(node.range.start, node.range.end, position)) continue;
      const width = node.range.end.offset - node.range.start.offset;
      if (
        closest === null ||
        (block.live && !closest.live) ||
        (block.live === closest.live && width < closest.width)
      ) {
        closest = { index: block.index, width, live: block.live };
      }
    }
  }
  return closest?.index;
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
    index: functionForPosition(props.functions, props.sourcePosition),
    sourcePosition: positionKey(props.sourcePosition),
  }));
  const currentPositionKey = positionKey(props.sourcePosition);
  const selectedFunction = selection.sourcePosition === currentPositionKey
    ? selection.index
    : functionForPosition(props.functions, props.sourcePosition);
  const functionIndex = Math.min(selectedFunction, Math.max(0, props.functions.length - 1));
  const fn = props.functions[functionIndex];
  const layout = useMemo(() => fn === undefined ? null : layoutBlocks(fn), [fn]);
  const positions = new Map(layout?.positioned.map((item) => [item.block.index, item]) ?? []);

  if (fn === undefined || layout === null) {
    return <div className="analysis-placeholder">Add a function to see its control flow.</div>;
  }
  const activeBlock = blockForPosition(fn, props.sourcePosition);

  return (
    <div className="analysis-visual analysis-visual--with-toolbar">
      <div className="analysis-toolbar">
        <label>
          <span>Function</span>
          <select
            value={functionIndex}
            onChange={(event) => setSelection({
              index: Number(event.target.value),
              sourcePosition: currentPositionKey,
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
      <GraphViewport
        key={`${fn.name}-${fn.range.start.offset}`}
        contentWidth={layout.width}
        contentHeight={layout.height}
        label={`Control flow graph for ${fn.name}`}
      >
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
            const active = block.index === activeBlock;
            return (
              <button
                type="button"
                key={block.index}
                className={`cfg-card${block.live ? "" : " cfg-card--unreachable"}${active ? " cfg-card--active" : ""}`}
                style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
                onClick={() => props.onSourcePositionSelect(blockPosition(block, fn.range.start))}
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
      </GraphViewport>
    </div>
  );
};
