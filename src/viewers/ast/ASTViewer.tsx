import { CodeViewer } from "../CodeViewer.tsx";
import React, { useMemo } from "react";
import { ViewerTitle } from "../ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { ASTNode } from "../../analysis.ts";
import { formatAST } from "./format.ts";
import {
  displayLineForSourceLine,
  FormattedAnalysis,
  sourceLineForDisplayLine,
} from "../lineMapping.ts";

interface ASTViewerProps {
  ast: ASTNode | string | null;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
  theme: "light" | "dark";
}

export const ASTViewer: React.FC<ASTViewerProps> = (props: ASTViewerProps) => {
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.ast === null) {
      return { content: "AST unavailable", sourceLines: [] };
    }
    if (typeof props.ast === "string") {
      return { content: props.ast, sourceLines: [] };
    }
    return formatAST(props.ast);
  }, [props.ast]);
  const displayLine = displayLineForSourceLine(
    formatted.sourceLines,
    props.sourceLine,
  );

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>AST</ViewerTitle>
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
