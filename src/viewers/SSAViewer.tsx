import { CodeViewer } from "./CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";

interface SSAViewerProps {
  src: string;
  srcPos: IPosition;
  ssa: string | undefined | null;
}

export const SSAViewer: React.FC<SSAViewerProps> = (props: SSAViewerProps) => {
  let content: string;

  if (props.ssa === undefined || props.ssa === null) {
    content = `SSA unavailable, try adding function declarations to the source`;
  } else {
    content = props.ssa;
  }

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>SSA</ViewerTitle>
      <CodeViewer
        content={content}
        line={props.srcPos.lineNumber}
        readOnly={true}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
