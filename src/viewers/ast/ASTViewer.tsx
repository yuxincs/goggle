import { CodeViewer } from "../CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "../ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { ASTNode } from "../../analysis.ts";
import { formatAST } from "./format.ts";

interface ASTViewerProps {
  src: string;
  srcPos: IPosition;
  ast: ASTNode | string | null;
  theme: "light" | "dark";
}

export const ASTViewer: React.FC<ASTViewerProps> = (props: ASTViewerProps) => {
  const content = props.ast === null
    ? "AST unavailable"
    : typeof props.ast === "string"
      ? props.ast
      : formatAST(props.ast);

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>AST</ViewerTitle>
      <CodeViewer
        content={content}
        line={props.srcPos.lineNumber}
        readOnly={true}
        theme={props.theme}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
