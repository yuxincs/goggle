import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { SSAFunction } from "../../wasm/protocol.ts";
import { formatSSA } from "./format.ts";
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
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>SSA</ViewerTitle>
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
