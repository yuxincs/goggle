import { CodeViewer } from "../CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "../ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../../constants.ts";
import { SSAFunction } from "../../analysis.ts";
import { formatSSA } from "./format.ts";

interface SSAViewerProps {
  src: string;
  srcPos: IPosition;
  ssa: SSAFunction[] | string | null;
  theme: "light" | "dark";
}

export const SSAViewer: React.FC<SSAViewerProps> = (props: SSAViewerProps) => {
  let content: string;

  if (props.ssa === null) {
    content = `SSA unavailable, try adding function declarations to the source`;
  } else if (typeof props.ssa === "string") {
    content = props.ssa;
  } else {
    content = formatSSA(props.ssa);
  }

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>SSA</ViewerTitle>
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
