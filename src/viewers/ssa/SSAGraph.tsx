import { useMemo, useState } from "react";
import { SSABlock, SSAFunction } from "../../wasm/protocol.ts";
import { GraphViewport } from "../shared/GraphViewport.tsx";
import { AnalysisPosition } from "../shared/lineMapping.ts";
import {
  analysisPositionKey,
  closestInstructionForPosition,
  functionForPosition,
} from "./position.ts";

interface SSAGraphProps {
  functions: SSAFunction[];
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
}

interface PositionedBlock {
  block: SSABlock;
  x: number;
  y: number;
}

const CARD_WIDTH = 232;
const CARD_HEIGHT = 132;
const COLUMN_GAP = 42;
const ROW_GAP = 66;
const CANVAS_PADDING = 28;
const VISIBLE_INSTRUCTIONS = 4;

const layoutBlocks = (fn: SSAFunction) => {
  const byIndex = new Map(fn.blocks.map((block) => [block.index, block]));
  const levels = new Map<number, number>();
  const first = fn.blocks[0];
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

  const unconnectedLevel = Math.max(0, ...levels.values()) + 1;
  for (const block of fn.blocks) {
    if (!levels.has(block.index)) levels.set(block.index, unconnectedLevel);
  }

  const layers = new Map<number, SSABlock[]>();
  for (const block of fn.blocks) {
    const level = levels.get(block.index) ?? 0;
    layers.set(level, [...(layers.get(level) ?? []), block]);
  }

  const widestLayer = Math.max(1, ...[...layers.values()].map((blocks) => blocks.length));
  const width = Math.max(
    500,
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

const edgePath = (
  source: PositionedBlock,
  target: PositionedBlock,
  canvasWidth: number,
) => {
  const startX = source.x + CARD_WIDTH / 2;
  const startY = source.y + CARD_HEIGHT;
  const endX = target.x + CARD_WIDTH / 2;
  const endY = target.y;
  if (endY > startY) {
    const middleY = startY + (endY - startY) / 2;
    return `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`;
  }
  return `M ${startX} ${startY} C ${canvasWidth - 12} ${startY + 20}, ${canvasWidth - 12} ${endY - 20}, ${endX} ${endY}`;
};

const dataEdgesForValue = (fn: SSAFunction, value: string | null) => {
  if (value === null) return [];
  const definitions = fn.blocks.filter((block) =>
    block.instructions.some((instruction) => instruction.result?.name === value)
  );
  const uses = fn.blocks.filter((block) =>
    block.instructions.some((instruction) =>
      instruction.operands.some((operand) => operand.name === value)
    )
  );
  return definitions.flatMap((definition) =>
    uses.flatMap((use) => definition.index === use.index ? [] : [[definition.index, use.index] as const])
  );
};

export const SSAGraph = (props: SSAGraphProps) => {
  const [selection, setSelection] = useState(() => ({
    index: functionForPosition(props.functions, props.sourcePosition),
    sourcePosition: analysisPositionKey(props.sourcePosition),
  }));
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const currentPositionKey = analysisPositionKey(props.sourcePosition);
  const selectedFunction = selection.sourcePosition === currentPositionKey
    ? selection.index
    : functionForPosition(props.functions, props.sourcePosition);
  const functionIndex = Math.min(selectedFunction, Math.max(0, props.functions.length - 1));
  const fn = props.functions[functionIndex];
  const layout = useMemo(() => fn === undefined ? null : layoutBlocks(fn), [fn]);
  const closestInstruction = useMemo(
    () => fn === undefined ? null : closestInstructionForPosition(fn, props.sourcePosition),
    [fn, props.sourcePosition],
  );

  if (fn === undefined || layout === null) {
    return <div className="analysis-placeholder">Add a function to graph its SSA form.</div>;
  }

  const positions = new Map(layout.positioned.map((item) => [item.block.index, item]));
  const availableValues = new Set(fn.blocks.flatMap((block) =>
    block.instructions.flatMap((instruction) =>
      instruction.result === undefined ? [] : [instruction.result.name]
    )
  ));
  const focusedValue = selectedValue !== null && availableValues.has(selectedValue)
    ? selectedValue
    : null;
  const dataEdges = dataEdgesForValue(fn, focusedValue);

  return (
    <div className="analysis-visual analysis-visual--with-toolbar">
      <div className="analysis-toolbar">
        <label>
          <span>Function</span>
          <select
            value={functionIndex}
            onChange={(event) => {
              setSelection({
                index: Number(event.target.value),
                sourcePosition: currentPositionKey,
              });
              setSelectedValue(null);
            }}
          >
            {props.functions.map((candidate, index) => (
              <option key={`${candidate.name}-${candidate.position.offset}`} value={index}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        {focusedValue === null
          ? <span className="analysis-toolbar__meta">Select a result to trace its uses</span>
          : (
            <button
              type="button"
              className="ssa-graph-focus"
              onClick={() => setSelectedValue(null)}
            >
              Following {focusedValue} · Clear
            </button>
          )}
      </div>
      <GraphViewport
        key={`${fn.name}-${fn.position.offset}`}
        contentWidth={layout.width}
        contentHeight={layout.height}
        label={`SSA graph for ${fn.name}`}
      >
        <div className="ssa-graph-canvas" style={{ width: layout.width, height: layout.height }}>
          <svg className="ssa-graph-edges" width={layout.width} height={layout.height} aria-hidden="true">
            <defs>
              <marker id="ssa-control-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" />
              </marker>
              <marker id="ssa-data-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" />
              </marker>
            </defs>
            {layout.positioned.flatMap((source) =>
              source.block.successors.map((successor) => {
                const target = positions.get(successor);
                if (target === undefined) return null;
                return (
                  <path
                    key={`control-${source.block.index}-${successor}`}
                    className="ssa-graph-edge--control"
                    d={edgePath(source, target, layout.width)}
                    markerEnd="url(#ssa-control-arrow)"
                  />
                );
              })
            )}
            {dataEdges.map(([definition, use]) => {
              const source = positions.get(definition);
              const target = positions.get(use);
              if (source === undefined || target === undefined) return null;
              return (
                <path
                  key={`data-${definition}-${use}`}
                  className="ssa-graph-edge--data"
                  d={edgePath(source, target, layout.width)}
                  markerEnd="url(#ssa-data-arrow)"
                />
              );
            })}
          </svg>
          {layout.positioned.map(({ block, x, y }) => {
            const active = closestInstruction?.blockIndex === block.index;
            const activeInstruction = active ? closestInstruction?.instruction : undefined;
            const visibleInstructions = block.instructions.slice(0, VISIBLE_INSTRUCTIONS);
            if (
              activeInstruction !== undefined &&
              !visibleInstructions.some((instruction) => instruction.index === activeInstruction.index)
            ) {
              visibleInstructions[VISIBLE_INSTRUCTIONS - 1] = activeInstruction;
            }
            const firstPosition = block.instructions.find((instruction) =>
              instruction.position !== undefined
            )?.position ?? fn.position;
            return (
              <section
                key={block.index}
                className={`ssa-graph-card${active ? " ssa-graph-card--active" : ""}`}
                style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
              >
                <button
                  type="button"
                  className="ssa-graph-card__header"
                  onClick={() => props.onSourcePositionSelect(firstPosition)}
                >
                  <strong>B{block.index}</strong>
                  <span>{block.comment ?? "block"}</span>
                  <span>{block.successors.length === 0 ? "exit" : `→ ${block.successors.map((successor) => `B${successor}`).join(", ")}`}</span>
                </button>
                <div className="ssa-graph-card__instructions">
                  {visibleInstructions.map((instruction) => {
                    const definition = focusedValue !== null && instruction.result?.name === focusedValue;
                    const use = focusedValue !== null && instruction.operands.some((operand) =>
                      operand.name === focusedValue
                    );
                    const instructionActive = closestInstruction?.blockIndex === block.index &&
                      closestInstruction.instruction.index === instruction.index;
                    return (
                      <div
                        key={instruction.index}
                        className={`ssa-graph-instruction${instructionActive ? " ssa-graph-instruction--active" : ""}${definition ? " ssa-graph-instruction--definition" : ""}${use ? " ssa-graph-instruction--use" : ""}`}
                      >
                        {instruction.result === undefined
                          ? <span className="ssa-graph-instruction__empty">·</span>
                          : (
                            <button
                              type="button"
                              className="ssa-graph-instruction__value"
                              title={`Trace ${instruction.result.name}: ${instruction.result.type}`}
                              onClick={() => setSelectedValue(instruction.result?.name ?? null)}
                            >
                              {instruction.result.name}
                            </button>
                          )}
                        <button
                          type="button"
                          className="ssa-graph-instruction__text"
                          title={instruction.text}
                          onClick={() => props.onSourcePositionSelect(
                            instruction.position ?? fn.position
                          )}
                        >
                          <span>{instruction.opcode}</span>
                          <code>{instruction.text}</code>
                        </button>
                      </div>
                    );
                  })}
                  {block.instructions.length > VISIBLE_INSTRUCTIONS && (
                    <span className="ssa-graph-card__more">
                      +{block.instructions.length - VISIBLE_INSTRUCTIONS} instructions
                    </span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </GraphViewport>
    </div>
  );
};
