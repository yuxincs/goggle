import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo, useState } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { CFGFunction } from "../../wasm/protocol.ts";
import { formatCFGs } from "./format.ts";
import { CFGGraph } from "./CFGGraph.tsx";
import { AnalysisViewMode, ViewModeToggle } from "../shared/ViewModeToggle.tsx";
import {
  displayLineForSourceLine,
  FormattedAnalysis,
  sourceLineForDisplayLine,
} from "../shared/lineMapping.ts";

interface CFGViewerProps {
  cfgs: CFGFunction[] | string | null;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
  theme: "light" | "dark";
}

export const CFGViewer: React.FC<CFGViewerProps> = (props: CFGViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("graph");
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.cfgs === null) {
      return {
        content: "CFG unavailable, try adding function declarations to the source",
        sourceLines: [],
      };
    }
    if (typeof props.cfgs === "string") {
      return { content: props.cfgs, sourceLines: [] };
    }
    return formatCFGs(props.cfgs);
  }, [props.cfgs]);
  const displayLine = displayLineForSourceLine(
    formatted.sourceLines,
    props.sourceLine,
  );

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>
        <span>CFG</span>
        <ViewModeToggle label="CFG" mode={mode} modes={["graph", "text"]} onChange={setMode} />
      </ViewerTitle>
      {mode === "graph"
        ? props.cfgs === null
          ? <div className="analysis-placeholder">CFG unavailable</div>
          : typeof props.cfgs === "string"
            ? <div className="analysis-placeholder analysis-placeholder--error">{props.cfgs}</div>
            : (
              <CFGGraph
                functions={props.cfgs}
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
