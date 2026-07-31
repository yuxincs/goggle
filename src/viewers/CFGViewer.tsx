import { CodeViewer } from "./CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";
import { CFGFunction, formatCFGs } from "../analysis.ts";

interface CFGViewerProps {
  src: string;
  srcPos: IPosition;
  cfgs: CFGFunction[] | string | null;
  theme: "light" | "dark";
}

export const CFGViewer: React.FC<CFGViewerProps> = (props: CFGViewerProps) => {
  let content: string;

  if (props.cfgs === null) {
    content = `CFG unavailable, try adding function declarations to the source`;
  } else if (typeof props.cfgs === "string") {
    content = props.cfgs;
  } else {
    content = formatCFGs(props.cfgs);
  }

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>CFG</ViewerTitle>
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
