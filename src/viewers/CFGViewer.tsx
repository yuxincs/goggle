import { CodeViewer } from "./CodeViewer.tsx";
import React from "react";
import { IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";

interface CFG {
  name: string;
  repr: string;
  dot: string;
}

interface CFGViewerProps {
  src: string;
  srcPos: IPosition;
  cfgs: CFG[] | string | undefined | null;
}

export const CFGViewer: React.FC<CFGViewerProps> = (props: CFGViewerProps) => {
  let content: string;

  if (props.cfgs === undefined || props.cfgs === null) {
    content = `CFG unavailable, try adding function declarations to the source`;
  } else if (typeof props.cfgs === "string") {
    content = props.cfgs;
  } else {
    const parts = [];
    for (const cfg of props.cfgs) {
      parts.push(`${cfg.name}\n${cfg.repr}`);
    }
    content = parts.join("\n");
  }

  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>CFG</ViewerTitle>
      <CodeViewer
        content={content}
        line={props.srcPos.lineNumber}
        readOnly={true}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
