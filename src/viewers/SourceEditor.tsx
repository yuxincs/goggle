import { CodeViewer } from "./CodeViewer.tsx";
import { editor, IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";

interface SourceEditorProps {
  onChange: (code: string | undefined) => void;
  onCursorChange: (event: editor.ICursorPositionChangedEvent) => void;
  onReady: () => void;
  initialContent: string;
  position: IPosition;
  theme: "light" | "dark";
}

export const SourceEditor = (props: SourceEditorProps) => {
  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>Go Source</ViewerTitle>
      <CodeViewer
        initialContent={props.initialContent}
        initialLine={props.position.lineNumber}
        line={props.position.lineNumber}
        onChange={props.onChange}
        onCursorChange={props.onCursorChange}
        onReady={props.onReady}
        theme={props.theme}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
