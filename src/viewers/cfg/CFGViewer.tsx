import { CodeViewer } from "../CodeViewer.tsx";
import React, { useMemo } from "react";
import { ViewerTitle } from "../ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { CFGFunction } from "../../analysis.ts";
import { formatCFGs } from "./format.ts";
import {
  displayLineForSourceLine,
  FormattedAnalysis,
  sourceLineForDisplayLine,
} from "../lineMapping.ts";

interface CFGViewerProps {
  cfgs: CFGFunction[] | string | null;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
  theme: "light" | "dark";
}

export const CFGViewer: React.FC<CFGViewerProps> = (props: CFGViewerProps) => {
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
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>CFG</ViewerTitle>
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
    </>
  );
};
