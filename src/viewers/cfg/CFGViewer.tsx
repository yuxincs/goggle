import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo, useState } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { CFGFunction } from "../../wasm/protocol.ts";
import { formatCFGs } from "./format.ts";
import { CFGGraph } from "./CFGGraph.tsx";
import { AnalysisViewMode, ViewModeToggle } from "../shared/ViewModeToggle.tsx";
import {
  AnalysisPosition,
  displayLineForSourcePosition,
  FormattedAnalysis,
  sourcePositionForDisplayLine,
} from "../shared/lineMapping.ts";

interface CFGViewerProps {
  cfgs: CFGFunction[] | string | null;
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
  theme: "light" | "dark";
}

export const CFGViewer: React.FC<CFGViewerProps> = (props: CFGViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("graph");
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.cfgs === null) {
      return {
        content: "CFG unavailable, try adding function declarations to the source",
        sourcePositions: [],
      };
    }
    if (typeof props.cfgs === "string") {
      return { content: props.cfgs, sourcePositions: [] };
    }
    return formatCFGs(props.cfgs);
  }, [props.cfgs]);
  const displayLine = displayLineForSourcePosition(
    formatted.sourcePositions,
    props.sourcePosition,
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
