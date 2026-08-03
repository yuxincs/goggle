import { KeyboardEvent, useMemo, useState } from "react";
import { SSAFunction, SSAInstruction, SSAValue } from "../../wasm/protocol.ts";

interface SSABlocksProps {
  functions: SSAFunction[];
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
}

const functionForLine = (functions: SSAFunction[], line: number) => {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  functions.forEach((fn, index) => {
    const positions = [
      fn.position.line,
      ...fn.blocks.flatMap((block) =>
        block.instructions.flatMap((instruction) =>
          instruction.position === undefined ? [] : [instruction.position.line]
        )
      ),
    ];
    const distance = Math.min(...positions.map((position) => Math.abs(position - line)));
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });
  return closestIndex;
};

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
  const [selection, setSelection] = useState(() => ({
    index: functionForLine(props.functions, props.sourceLine),
    sourceLine: props.sourceLine,
  }));
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const selectedFunction = selection.sourceLine === props.sourceLine
    ? selection.index
    : functionForLine(props.functions, props.sourceLine);
  const functionIndex = Math.min(selectedFunction, Math.max(0, props.functions.length - 1));
  const fn = props.functions[functionIndex];
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

  if (fn === undefined) {
    return <div className="analysis-placeholder">Add a function to inspect its SSA form.</div>;
  }

  const selectInstruction = (instruction: SSAInstruction) => {
    props.onSourceLineSelect(instruction.position?.line ?? fn.position.line);
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
                sourceLine: props.sourceLine,
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
      <div className="ssa-scroll">
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
            const active = block.instructions.some((instruction) =>
              instruction.position?.line === props.sourceLine
            );
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
                    return (
                      <div
                        key={instruction.index}
                        className={`ssa-instruction${definition ? " ssa-instruction--definition" : ""}${use ? " ssa-instruction--use" : ""}${dimmed ? " ssa-instruction--dimmed" : ""}`}
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
