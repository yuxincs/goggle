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
  displayLineForSourceLine,
  FormattedAnalysis,
  sourceLineForDisplayLine,
} from "../shared/lineMapping.ts";

interface SSAViewerProps {
  ssa: SSAFunction[] | string | null;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
  theme: "light" | "dark";
}

export const SSAViewer: React.FC<SSAViewerProps> = (props: SSAViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("blocks");
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.ssa === null) {
      return {
        content: "SSA unavailable, try adding function declarations to the source",
        sourceLines: [],
      };
    }
    if (typeof props.ssa === "string") {
      return { content: props.ssa, sourceLines: [] };
    }
    return formatSSA(props.ssa);
  }, [props.ssa]);
  const displayLine = displayLineForSourceLine(
    formatted.sourceLines,
    props.sourceLine,
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
                sourceLine={props.sourceLine}
                onSourceLineSelect={props.onSourceLineSelect}
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
                  sourceLine={props.sourceLine}
                  onSourceLineSelect={props.onSourceLineSelect}
                />
              )
        : (
          <CodeViewer
            content={formatted.content}
            line={displayLine}
            onCursorChange={(event) => {
              const sourceLine = sourceLineForDisplayLine(
                formatted.sourceLines,
                event.position.lineNumber,
              );
              if (sourceLine !== undefined) {
                props.onSourceLineSelect(sourceLine);
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
