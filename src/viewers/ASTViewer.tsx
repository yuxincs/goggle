import { CodeViewer } from "./CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";

interface ASTViewerProps {
  src: string;
  srcPos: IPosition;
  ast: string;
}

export const ASTViewer: React.FC<ASTViewerProps> = (props: ASTViewerProps) => {
  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>AST</ViewerTitle>
      <CodeViewer
        content={props.ast}
        line={props.srcPos.lineNumber}
        readOnly={true}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
