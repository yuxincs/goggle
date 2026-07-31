import { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
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
  readonly onReady?: () => void;
  readonly readOnly?: boolean;
  readonly theme?: "light" | "dark";
}

export const CodeViewer = (props: CodeViewerProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const [mountedEditor, setMountedEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const onCursorChangeRef = useRef(props.onCursorChange);
  const onReadyRef = useRef(props.onReady);
  const suppressCursorChangeRef = useRef(false);
  useEffect(() => {
    onCursorChangeRef.current = props.onCursorChange;
  }, [props.onCursorChange]);
  useEffect(() => {
    onReadyRef.current = props.onReady;
  }, [props.onReady]);

  // We intentionally do not use the `value` and `line` props of the `Editor` component since it does not provide
  // a way to reveal the line in center (it puts the line as the first line, which leads to bad UX). This means we
  // have to do updates ourselves. Furthermore, we cannot do partial updates ourselves (e.g., use `value` props and
  // update line ourselves), since internally `Editor` component would reset our line update. Therefore, here we define
  // an updater that updates everything we need to update. All updates within this component _must_ be handled by it.
  const update = useCallback((content: string | undefined, line: number | undefined) => {
    const ref = editorRef.current;
    if (ref == null) {
      return;
    }
    const shouldUpdateContent = content !== undefined &&
      ref.getValue() !== content;
    const shouldUpdateLine = line !== undefined &&
      (shouldUpdateContent || ref.getPosition()?.lineNumber !== line);
    if (!shouldUpdateContent && !shouldUpdateLine) {
      return;
    }

    suppressCursorChangeRef.current = true;
    try {
      if (shouldUpdateContent) {
        ref.setValue(content);
      }
      if (shouldUpdateLine) {
        ref.revealLineInCenterIfOutsideViewport(line, ScrollType.Smooth);
        ref.setPosition({ lineNumber: line, column: 1 });
      }
    } finally {
      suppressCursorChangeRef.current = false;
    }
  }, []);

  const handleOnMount = (editor: editor.IStandaloneCodeEditor) => {
    // Keep a ref for other uses.
    editorRef.current = editor;
    setMountedEditor(editor);

    // Register cursor position change listener.
    editor.onDidChangeCursorPosition((event) => {
      if (!suppressCursorChangeRef.current) {
        onCursorChangeRef.current?.(event);
      }
    });
  };

  const handleOnChange = (code: string | undefined) => {
    if (props.onChange === undefined) {
      return;
    }
    props.onChange(code ?? "");
  };

  useEffect(() => {
    if (mountedEditor === null) return;
    update(
      props.content ?? props.initialContent,
      props.line ?? props.initialLine,
    );
    onReadyRef.current?.();
  }, [
    mountedEditor,
    props.content,
    props.initialContent,
    props.line,
    props.initialLine,
    update,
  ]);

  return (
    <Editor
      height={props.height ?? "100%"}
      language="go"
      theme={props.theme === "light" ? "goggle-light" : "goggle-dark"}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme("goggle-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "667085", fontStyle: "italic" },
            { token: "keyword", foreground: "C792EA" },
            { token: "string", foreground: "A9DC76" },
            { token: "number", foreground: "F78C6C" },
            { token: "type", foreground: "82AAFF" },
          ],
          colors: {
            "editor.background": "#11141b",
            "editor.foreground": "#D8DEE9",
            "editorLineNumber.foreground": "#434B5B",
            "editorLineNumber.activeForeground": "#AAB2C0",
            "editor.lineHighlightBackground": "#171C27",
            "editorCursor.foreground": "#66D9A8",
            "editor.selectionBackground": "#293B4F",
            "editor.inactiveSelectionBackground": "#202D3D",
            "editorIndentGuide.background1": "#232936",
            "editorIndentGuide.activeBackground1": "#394252",
            "scrollbarSlider.background": "#39425266",
            "scrollbarSlider.hoverBackground": "#4B566A88",
          },
        });
        monaco.editor.defineTheme("goggle-light", {
          base: "vs",
          inherit: true,
          rules: [
            { token: "comment", foreground: "7C8799", fontStyle: "italic" },
            { token: "keyword", foreground: "7C3AED" },
            { token: "string", foreground: "16845B" },
            { token: "number", foreground: "C2410C" },
            { token: "type", foreground: "2563EB" },
          ],
          colors: {
            "editor.background": "#FFFFFF",
            "editor.foreground": "#202633",
            "editorLineNumber.foreground": "#A4ABBA",
            "editorLineNumber.activeForeground": "#4B5565",
            "editor.lineHighlightBackground": "#F4F6F9",
            "editorCursor.foreground": "#0E9F6E",
            "editor.selectionBackground": "#CFE8DE",
            "editor.inactiveSelectionBackground": "#E2F1EB",
            "editorIndentGuide.background1": "#E6E9EF",
            "editorIndentGuide.activeBackground1": "#C4CAD5",
          },
        });
      }}
      onChange={handleOnChange}
      onMount={handleOnMount}
      loading={false}
      options={{
        readOnly: props.readOnly,
        minimap: { enabled: false },
        overviewRulerLanes: 0,
        automaticLayout: true,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13,
        lineHeight: 22,
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: "all",
        roundedSelection: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
      }}
    />
  );
};
