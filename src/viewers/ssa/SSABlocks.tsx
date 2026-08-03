import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { SSAFunction, SSAInstruction, SSAValue } from "../../wasm/protocol.ts";
import { AnalysisPosition } from "../shared/lineMapping.ts";
import {
  analysisPositionKey,
  closestInstructionForPosition,
  functionForPosition,
} from "./position.ts";

interface SSABlocksProps {
  functions: SSAFunction[];
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
}

const ValueChip = (props: {
  value: SSAValue;
  selected: boolean;
  onSelect: (name: string) => void;
}) => (
  <button
    type="button"
    className={`ssa-value${props.selected ? " ssa-value--selected" : ""}`}
    title={props.value.text}
    onClick={(event) => {
      event.stopPropagation();
      props.onSelect(props.value.name);
    }}
  >
    <strong>{props.value.name}</strong>
    <span>{props.value.type}</span>
  </button>
);

const instructionHasValue = (instruction: SSAInstruction, value: string) =>
  instruction.result?.name === value ||
  instruction.operands.some((operand) => operand.name === value);

export const SSABlocks = (props: SSABlocksProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const closestInstruction = useMemo(
    () => fn === undefined ? null : closestInstructionForPosition(fn, props.sourcePosition),
    [fn, props.sourcePosition],
  );
  const closestInstructionKey = closestInstruction === null
    ? null
    : `${closestInstruction.blockIndex}:${closestInstruction.instruction.index}`;
  const availableValues = useMemo(() => new Set([
    ...(fn?.parameters.map((parameter) => parameter.name) ?? []),
    ...(fn?.blocks.flatMap((block) =>
      block.instructions.flatMap((instruction) => [
        ...(instruction.result === undefined ? [] : [instruction.result.name]),
        ...instruction.operands.map((operand) => operand.name),
      ])
    ) ?? []),
  ]), [fn]);
  const focusedValue = selectedValue !== null && availableValues.has(selectedValue)
    ? selectedValue
    : null;
  const valueStats = useMemo(() => {
    if (fn === undefined || focusedValue === null) return null;
    const instructions = fn.blocks.flatMap((block) => block.instructions);
    return {
      definitions: instructions.filter((instruction) => instruction.result?.name === focusedValue).length,
      uses: instructions.filter((instruction) =>
        instruction.operands.some((operand) => operand.name === focusedValue)
      ).length,
    };
  }, [fn, focusedValue]);

  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>('[data-source-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [closestInstructionKey]);

  if (fn === undefined) {
    return <div className="analysis-placeholder">Add a function to inspect its SSA form.</div>;
  }

  const selectInstruction = (instruction: SSAInstruction) => {
    props.onSourcePositionSelect(instruction.position ?? fn.position);
  };
  const selectInstructionWithKeyboard = (
    event: KeyboardEvent<HTMLDivElement>,
    instruction: SSAInstruction,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectInstruction(instruction);
  };

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
        <span className="analysis-toolbar__meta">{fn.blocks.length} blocks</span>
      </div>
      <div ref={scrollRef} className="ssa-scroll">
        <div className="ssa-signature">
          <span className="ssa-signature__name">{fn.name}</span>
          <code>{fn.signature}</code>
          <div className="ssa-parameters">
            {fn.parameters.map((parameter) => (
              <ValueChip
                key={parameter.name}
                value={parameter}
                selected={focusedValue === parameter.name}
                onSelect={setSelectedValue}
              />
            ))}
          </div>
        </div>

        {focusedValue !== null && valueStats !== null && (
          <div className="ssa-focus">
            <span>Following <strong>{focusedValue}</strong></span>
            <span>{valueStats.definitions} definition · {valueStats.uses} uses</span>
            <button type="button" onClick={() => setSelectedValue(null)}>Clear</button>
          </div>
        )}

        <div className="ssa-blocks">
          {fn.blocks.map((block) => {
            const active = closestInstruction?.blockIndex === block.index;
            return (
              <section
                key={block.index}
                className={`ssa-block${active ? " ssa-block--active" : ""}`}
              >
                <header className="ssa-block__header">
                  <span><strong>B{block.index}</strong>{block.comment === undefined ? "" : ` · ${block.comment}`}</span>
                  <span>in {block.predecessors.length === 0 ? "—" : block.predecessors.map((index) => `B${index}`).join(", ")}</span>
                  <span>out {block.successors.length === 0 ? "—" : block.successors.map((index) => `B${index}`).join(", ")}</span>
                </header>
                <div className="ssa-block__instructions">
                  {block.instructions.map((instruction) => {
                    const definition = focusedValue !== null && instruction.result?.name === focusedValue;
                    const use = focusedValue !== null && instruction.operands.some((operand) =>
                      operand.name === focusedValue
                    );
                    const dimmed = focusedValue !== null && !instructionHasValue(instruction, focusedValue);
                    const instructionActive = closestInstruction?.blockIndex === block.index &&
                      closestInstruction.instruction.index === instruction.index;
                    return (
                      <div
                        key={instruction.index}
                        className={`ssa-instruction${instructionActive ? " ssa-instruction--active" : ""}${definition ? " ssa-instruction--definition" : ""}${use ? " ssa-instruction--use" : ""}${dimmed ? " ssa-instruction--dimmed" : ""}`}
                        data-source-selected={instructionActive ? "true" : undefined}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectInstruction(instruction)}
                        onKeyDown={(event) => selectInstructionWithKeyboard(event, instruction)}
                      >
                        <span className="ssa-instruction__index">{instruction.index}</span>
                        <span className="ssa-instruction__opcode">{instruction.opcode}</span>
                        <div className="ssa-instruction__body">
                          <div className="ssa-instruction__expression">
                            {instruction.result !== undefined && (
                              <>
                                <ValueChip
                                  value={instruction.result}
                                  selected={focusedValue === instruction.result.name}
                                  onSelect={setSelectedValue}
                                />
                                <span className="ssa-instruction__equals">=</span>
                              </>
                            )}
                            <code>{instruction.text}</code>
                          </div>
                          {instruction.operands.length > 0 && (
                            <div className="ssa-instruction__operands">
                              <span>uses</span>
                              {instruction.operands.map((operand, index) => (
                                <ValueChip
                                  key={`${operand.name}-${index}`}
                                  value={operand}
                                  selected={focusedValue === operand.name}
                                  onSelect={setSelectedValue}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
