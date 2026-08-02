import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo, useState } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { ASTNode } from "../../wasm/protocol.ts";
import { formatAST } from "./format.ts";
import { ASTTree } from "./ASTTree.tsx";
import { AnalysisViewMode, ViewModeToggle } from "../shared/ViewModeToggle.tsx";
import {
  displayLineForSourceLine,
  FormattedAnalysis,
  sourceLineForDisplayLine,
} from "../shared/lineMapping.ts";

interface ASTViewerProps {
  ast: ASTNode | string | null;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
  theme: "light" | "dark";
}

export const ASTViewer: React.FC<ASTViewerProps> = (props: ASTViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("visual");
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
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>
        <span>AST</span>
        <ViewModeToggle label="AST" mode={mode} onChange={setMode} />
      </ViewerTitle>
      {mode === "visual"
        ? props.ast === null
          ? <div className="analysis-placeholder">AST unavailable</div>
          : typeof props.ast === "string"
            ? <div className="analysis-placeholder analysis-placeholder--error">{props.ast}</div>
            : (
              <ASTTree
                root={props.ast}
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
