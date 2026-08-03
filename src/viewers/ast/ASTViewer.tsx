import { CodeViewer } from "../shared/CodeViewer.tsx";
import React, { useMemo, useState } from "react";
import { ViewerTitle } from "../shared/ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { ASTNode } from "../../wasm/protocol.ts";
import { formatAST } from "./format.ts";
import { ASTTree } from "./ASTTree.tsx";
import { AnalysisViewMode, ViewModeToggle } from "../shared/ViewModeToggle.tsx";
import {
  AnalysisPosition,
  displayLineForSourcePosition,
  FormattedAnalysis,
  sourcePositionForDisplayLine,
} from "../shared/lineMapping.ts";

interface ASTViewerProps {
  ast: ASTNode | string | null;
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
  theme: "light" | "dark";
}

export const ASTViewer: React.FC<ASTViewerProps> = (props: ASTViewerProps) => {
  const [mode, setMode] = useState<AnalysisViewMode>("tree");
  const formatted = useMemo<FormattedAnalysis>(() => {
    if (props.ast === null) {
      return { content: "AST unavailable", sourcePositions: [] };
    }
    if (typeof props.ast === "string") {
      return { content: props.ast, sourcePositions: [] };
    }
    return formatAST(props.ast);
  }, [props.ast]);
  const displayLine = displayLineForSourcePosition(
    formatted.sourcePositions,
    props.sourcePosition,
  );

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>
        <span>AST</span>
        <ViewModeToggle label="AST" mode={mode} modes={["tree", "text"]} onChange={setMode} />
      </ViewerTitle>
      {mode === "tree"
        ? props.ast === null
          ? <div className="analysis-placeholder">AST unavailable</div>
          : typeof props.ast === "string"
            ? <div className="analysis-placeholder analysis-placeholder--error">{props.ast}</div>
            : (
              <ASTTree
                root={props.ast}
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
