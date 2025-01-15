import { CodeViewer } from "./CodeViewer.tsx";
import { editor, IPosition } from "monaco-editor";
import { ViewerTitle } from "./ViewerTitle.tsx";
import { VIEWER_TITLE_HEIGHT } from "../constants.ts";

interface SourceEditorProps {
  onChange: (code: string | undefined) => void;
  onCursorChange: (event: editor.ICursorPositionChangedEvent) => void;
  initialContent: string;
  initialPosition: IPosition;
}

export const SourceEditor = (props: SourceEditorProps) => {
  return (
    <>
      <ViewerTitle sx={{ height: VIEWER_TITLE_HEIGHT }}>Go Source</ViewerTitle>
      <CodeViewer
        initialContent={props.initialContent}
        initialLine={props.initialPosition.lineNumber}
        onChange={props.onChange}
        onCursorChange={props.onCursorChange}
        height={`calc(100% - ${VIEWER_TITLE_HEIGHT})`}
      />
    </>
  );
};
