import { editor } from "monaco-editor";
import { useRef } from "react";
import { Editor } from "@monaco-editor/react";
import ScrollType = editor.ScrollType;

export interface CodeViewerProps {
  readonly content?: string;
  readonly initialContent?: string;
  readonly line?: number;
  readonly initialLine?: number;
  readonly height?: string | number;
  readonly onChange?: (code: string) => void;
  readonly onCursorChange?: (event: editor.ICursorPositionChangedEvent) => void;
  readonly readOnly?: boolean;
}

export const CodeViewer = (props: CodeViewerProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor>();

  // We intentionally do not use the `value` and `line` props of the `Editor` component since it does not provide
  // a way to reveal the line in center (it puts the line as the first line, which leads to bad UX). This means we
  // have to do updates ourselves. Furthermore, we cannot do partial updates ourselves (e.g., use `value` props and
  // update line ourselves), since internally `Editor` component would reset our line update. Therefore, here we define
  // an updater that updates everything we need to update. All updates within this component _must_ be handled by it.
  const update = (content: string | undefined, line: number | undefined) => {
    const ref = editorRef.current;
    if (ref == null) {
      return;
    }
    if (content !== undefined) {
      ref.setValue(content);
    }
    if (line !== undefined) {
      ref.revealLineInCenterIfOutsideViewport(line, ScrollType.Smooth);
      ref.setPosition({ lineNumber: line, column: 1 });
    }
  };

  const handleOnMount = (editor: editor.IStandaloneCodeEditor) => {
    // Keep a ref for other uses.
    editorRef.current = editor;

    // Register cursor position change listener.
    if (props.onCursorChange !== undefined) {
      editor.onDidChangeCursorPosition(props.onCursorChange);
    }

    // Set the initial content and line if given.
    // Here at the end of onMount, we do not really have a fully-initialized editor yet. Initially it would just be
    // a 5px * 5px component, and calling revealLineInCenter will not really put the line in center (because the
    // viewport is not properly initialized yet). Ideally, we should listen on ready event and then set the initial
    // content and reveal the initial line. However, the event is not implemented (see more details at the issue
    // https://github.com/microsoft/monaco-editor/issues/115). A hacky workaround is to listen on
    // "onDidLayoutChange" instead, which should be fired whenever the editor is initialized. We dispose the listener
    // after the first event to avoid setting the initial content again.
    if (props.initialContent == null && props.initialLine == null) {
      // Early return if nothing to do.
      return;
    }
    const disposable = editor.onDidLayoutChange(() => {
      disposable.dispose();
      update(props.initialContent, props.initialLine);
    });
  };

  const handleOnChange = (code: string | undefined) => {
    if (props.onChange === undefined) {
      return;
    }
    props.onChange(code ?? "");
  };

  update(props.content, props.line);

  return (
    <Editor
      height={props.height ?? "100%"}
      language="go"
      onChange={handleOnChange}
      onMount={handleOnMount}
      loading={false}
      options={{
        readOnly: props.readOnly,
        minimap: { enabled: false },
        overviewRulerLanes: 0,
        automaticLayout: true,
      }}
    />
  );
};
