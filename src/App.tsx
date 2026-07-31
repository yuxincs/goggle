import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { IPosition } from "monaco-editor";
import { loadGoggleWasm } from "./utils/wasm.ts";
import { ASTViewer } from "./viewers/ast/ASTViewer.tsx";
import { CFGViewer } from "./viewers/cfg/CFGViewer.tsx";
import { SSAViewer } from "./viewers/ssa/SSAViewer.tsx";
import { SourceEditor } from "./viewers/SourceEditor.tsx";
import { Title } from "./title/Title.tsx";
import {
  AnalysisResult,
  ASTNode,
  CFGFunction,
  SSAFunction,
} from "./analysis.ts";

// We store the Go source and the last cursor position in local storage such that users will not lose their input.
const defaultCode = `// You can edit this code!
// Click here and start typing.
package main

func foo() bool { return true }

func main() {
    var dummy bool
    ok := foo()
    if dummy {
        if ok {
            print(ok)
        }
    }
}
`
const storedSrc = localStorage.getItem("src") ?? defaultCode;
const storedPos: IPosition = {
  lineNumber: Number(localStorage.getItem("srcLine") ?? "1"),
  column: Number(localStorage.getItem("srcCol") ?? "1"),
};
const storedTheme = (localStorage.getItem("theme") as "light" | "dark" | null) ?? "dark";

export const App = () => {
  const [src, setSrc] = useState<string>(storedSrc);
  const [srcPos, setSrcPos] = useState<IPosition>(storedPos);
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(storedTheme);
  const [columnSplit, setColumnSplit] = useState(50);
  const [leftRowSplit, setLeftRowSplit] = useState(50);
  const [rightRowSplit, setRightRowSplit] = useState(50);
  const workspaceRef = useRef<HTMLElement>(null);

  const [ast, setAST] = useState<ASTNode | string | null>(null);
  const [cfgs, setCFGs] = useState<CFGFunction[] | string | null>(null);
  const [ssa, setSSA] = useState<SSAFunction[] | string | null>(null);

  // Start Go WebAssembly such that the parse function is available in global this.
  // Then, load the source and position from local storage and set then.
  useEffect(() => {
    loadGoggleWasm().then(() => {
      setIsReady(true);
      handleSrcChange(storedSrc);
      handleSrcPosChange(storedPos);
    });
  }, []);

  // Update source and position in local storage anytime they change.
  useEffect(() => localStorage.setItem("src", src), [src]);
  useEffect(() => {
    localStorage.setItem("srcLine", srcPos.lineNumber.toString());
    localStorage.setItem("srcCol", srcPos.column.toString());
  }, [srcPos]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);

  function handleSrcChange(code: string | undefined) {
    const renderError = (error: string) => {
      setAST(`ERROR: ${error}`);
      setCFGs(`ERROR: ${error}`);
      setSSA(`ERROR: ${error}`);
    };

    if (code === undefined) {
      renderError("no source input");
      return;
    }

    // @ts-expect-error: `parse` is injected into global this by the Goggle WebAssembly module.
    if (globalThis.parse === undefined) {
      renderError("WASM: Go wasm may not have been initialized yet");
      return;
    }
    setSrc(code);

    // @ts-expect-error: `parse` is injected into global this by the Goggle WebAssembly module.
    const result = globalThis.parse(code);
    if (result.error !== undefined) {
      renderError(result.error);
      return;
    }

    const body = JSON.parse(result.body) as AnalysisResult;
    setAST(body.ast);
    setCFGs(body.cfgs);
    setSSA(body.ssa);
  }

  function handleSrcPosChange(pos: IPosition) {
    setSrcPos((current) =>
      current.lineNumber === pos.lineNumber && current.column === pos.column
        ? current
        : pos
    );
  }

  const handleAnalysisLineSelect = (lineNumber: number) => {
    setSrcPos((current) =>
      current.lineNumber === lineNumber
        ? current
        : { lineNumber, column: 1 }
    );
  };

  const hasError = typeof ast === "string" && ast.startsWith("ERROR:");

  type Splitter = "column" | "leftRow" | "rightRow";

  const resizePane = (splitter: Splitter, clientPosition: number) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (bounds === undefined) return;

    const isColumn = splitter === "column";
    const start = isColumn ? bounds.left : bounds.top;
    const size = isColumn ? bounds.width : bounds.height;
    const next = Math.min(92, Math.max(8, ((clientPosition - start) / size) * 100));
    const value = Math.round(next * 10) / 10;
    if (splitter === "column") setColumnSplit(value);
    if (splitter === "leftRow") setLeftRowSplit(value);
    if (splitter === "rightRow") setRightRowSplit(value);
  };

  const handleSplitterMove = (
    splitter: Splitter,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    resizePane(splitter, splitter === "column" ? event.clientX : event.clientY);
  };

  const handleSplitterKey = (
    splitter: Splitter,
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    const current = splitter === "column"
      ? columnSplit
      : splitter === "leftRow"
        ? leftRowSplit
        : rightRowSplit;
    const relevantKeys = splitter === "column" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
    if (!relevantKeys.includes(event.key) && event.key !== "Home" && event.key !== "End") return;

    event.preventDefault();
    const decrement = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const next = event.key === "Home" ? 8 : event.key === "End" ? 92 : current + (decrement ? -2 : 2);
    const value = Math.min(92, Math.max(8, next));
    if (splitter === "column") setColumnSplit(value);
    if (splitter === "leftRow") setLeftRowSplit(value);
    if (splitter === "rightRow") setRightRowSplit(value);
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <Title
        isReady={isReady}
        hasError={hasError}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />

      <main
        className="workspace"
        ref={workspaceRef}
        style={{
          gridTemplateColumns: `${columnSplit}fr ${100 - columnSplit}fr`,
        }}
      >
        <div
          className="pane-column"
          style={{ gridTemplateRows: `${leftRowSplit}fr ${100 - leftRowSplit}fr` }}
        >
          <section className="panel panel--source" aria-label="Go source editor">
            <SourceEditor
              initialContent={src}
              position={srcPos}
              onChange={handleSrcChange}
              onCursorChange={(event) => handleSrcPosChange(event.position)}
              theme={theme}
            />
          </section>

          <section className="panel" aria-label="Control flow graph">
            <CFGViewer
              cfgs={cfgs}
              sourceLine={srcPos.lineNumber}
              onSourceLineSelect={handleAnalysisLineSelect}
              theme={theme}
            />
          </section>

          <div
            className="splitter splitter--horizontal"
            style={{ top: `${leftRowSplit}%` }}
            role="separator"
            aria-label="Resize source and CFG panes"
            aria-orientation="horizontal"
            aria-valuemin={8}
            aria-valuemax={92}
            aria-valuenow={leftRowSplit}
            tabIndex={0}
            onDoubleClick={() => setLeftRowSplit(50)}
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={(event) => handleSplitterMove("leftRow", event)}
            onKeyDown={(event) => handleSplitterKey("leftRow", event)}
          />
        </div>

        <div
          className="pane-column"
          style={{ gridTemplateRows: `${rightRowSplit}fr ${100 - rightRowSplit}fr` }}
        >
          <section className="panel" aria-label="Abstract syntax tree">
            <ASTViewer
              ast={ast}
              sourceLine={srcPos.lineNumber}
              onSourceLineSelect={handleAnalysisLineSelect}
              theme={theme}
            />
          </section>

          <section className="panel" aria-label="Static single assignment form">
            <SSAViewer
              ssa={ssa}
              sourceLine={srcPos.lineNumber}
              onSourceLineSelect={handleAnalysisLineSelect}
              theme={theme}
            />
          </section>

          <div
            className="splitter splitter--horizontal"
            style={{ top: `${rightRowSplit}%` }}
            role="separator"
            aria-label="Resize AST and SSA panes"
            aria-orientation="horizontal"
            aria-valuemin={8}
            aria-valuemax={92}
            aria-valuenow={rightRowSplit}
            tabIndex={0}
            onDoubleClick={() => setRightRowSplit(50)}
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={(event) => handleSplitterMove("rightRow", event)}
            onKeyDown={(event) => handleSplitterKey("rightRow", event)}
          />
        </div>

        <div
          className="splitter splitter--vertical"
          style={{ left: `${columnSplit}%` }}
          role="separator"
          aria-label="Resize pane columns"
          aria-orientation="vertical"
          aria-valuemin={8}
          aria-valuemax={92}
          aria-valuenow={columnSplit}
          tabIndex={0}
          onDoubleClick={() => setColumnSplit(50)}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={(event) => handleSplitterMove("column", event)}
          onKeyDown={(event) => handleSplitterKey("column", event)}
        />
      </main>

      <footer className="status-bar">
        <span className="status-bar__location">
          Ln {srcPos.lineNumber}, Col {srcPos.column}
        </span>
        <span>Go</span>
        <span>UTF-8</span>
        <span className="status-bar__engine">Runs locally in your browser</span>
      </footer>
    </div>
  );
};

export default App;
