import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo, useState } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { SSAFunction } from "../../wasm/protocol.ts";
import { formatSSA } from "./format.ts";
import { SSABlocks } from "./SSABlocks.tsx";
import { SSAGraph } from "./SSAGraph.tsx";
import { AnalysisViewMode, ViewModeToggle } from "../shared/ViewModeToggle.tsx";
import {
  AnalysisPosition,
  displayLineForSourcePosition,
  FormattedAnalysis,
  sourcePositionForDisplayLine,
} from "../shared/lineMapping.ts";

interface SSAViewerProps {
  ssa: SSAFunction[] | string | null;
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
  theme: "light" | "dark";
}

export const SSAViewer: React.FC<SSAViewerProps> = (props: SSAViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("blocks");
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.ssa === null) {
      return {
        content: "SSA unavailable, try adding function declarations to the source",
        sourcePositions: [],
      };
    }
    if (typeof props.ssa === "string") {
      return { content: props.ssa, sourcePositions: [] };
    }
    return formatSSA(props.ssa);
  }, [props.ssa]);
  const displayLine = displayLineForSourcePosition(
    formatted.sourcePositions,
    props.sourcePosition,
  );

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>
        <span>SSA</span>
        <ViewModeToggle
          label="SSA"
          mode={mode}
          modes={["blocks", "graph", "text"]}
          onChange={setMode}
        />
      </ViewerTitle>
      {mode === "blocks"
        ? props.ssa === null
          ? <div className="analysis-placeholder">SSA unavailable</div>
          : typeof props.ssa === "string"
            ? <div className="analysis-placeholder analysis-placeholder--error">{props.ssa}</div>
            : (
              <SSABlocks
                functions={props.ssa}
                sourcePosition={props.sourcePosition}
                onSourcePositionSelect={props.onSourcePositionSelect}
              />
            )
        : mode === "graph"
          ? props.ssa === null
            ? <div className="analysis-placeholder">SSA unavailable</div>
            : typeof props.ssa === "string"
              ? <div className="analysis-placeholder analysis-placeholder--error">{props.ssa}</div>
              : (
                <SSAGraph
                  functions={props.ssa}
                  sourcePosition={props.sourcePosition}
                  onSourcePositionSelect={props.onSourcePositionSelect}
                />
              )
        : (
          <CodeViewer
            content={formatted.content}
            line={displayLine}
            onCursorChange={(event) => {
              const sourcePosition = sourcePositionForDisplayLine(
                formatted.sourcePositions,
                event.position.lineNumber,
              );
              if (sourcePosition !== undefined) {
                props.onSourcePositionSelect(sourcePosition);
              }
            }}
            readOnly={true}
            theme={props.theme}
            height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
          />
        )}
    </>
  );
};
