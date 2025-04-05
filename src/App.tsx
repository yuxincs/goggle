import { useEffect, useState } from "react";
import { IPosition } from "monaco-editor";
import Grid from "@mui/material/Grid";
import { loadGoggleWasm } from "./utils/wasm.ts";
import { ASTViewer } from "./viewers/ASTViewer.tsx";
import { CFGViewer } from "./viewers/CFGViewer.tsx";
import { SSAViewer } from "./viewers/SSAViewer.tsx";
import { SourceEditor } from "./viewers/SourceEditor.tsx";
import { Title } from "./title/Title.tsx";

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
  lineNumber: Number(localStorage.getItem("srcLine")) ?? 1,
  column: Number(localStorage.getItem("srcCol")) ?? 1,
};

export const App = () => {
  const [src, setSrc] = useState<string>(storedSrc);
  const [srcPos, setSrcPos] = useState<IPosition>(storedPos);

  const [ast, setAST] = useState<string>("");
  const [cfgs, setCFGs] = useState<string>("");
  const [ssa, setSSA] = useState<string>("");

  // Start Go WebAssembly such that the parse function is available in global this.
  // Then, load the source and position from local storage and set then.
  useEffect(() => {
    loadGoggleWasm().then(() => {
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

  const handleSrcChange = (code: string | undefined) => {
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

    const body = JSON.parse(result.body);
    setAST(body.ast);
    setCFGs(body.cfgs);
    setSSA(body.ssa);
  };

  const handleSrcPosChange = (pos: IPosition) => setSrcPos(pos);

  return (
      <Grid container sx={{ width: '100%' }}>
        <Grid size={12} height="64px" >
          <Title />
        </Grid>

        <Grid container height="calc(100vh - 64px)" width="100%">
          <Grid
            size={6}
            sx={{
              borderRight: "1px solid lightgray",
              borderBottom: "1px solid lightgray",
            }}
          >
            <SourceEditor
              initialContent={src}
              initialPosition={srcPos}
              onChange={handleSrcChange}
              onCursorChange={(event) => handleSrcPosChange(event.position)}
            />
          </Grid>
          <Grid size={6} sx={{ borderBottom: "1px solid lightgray" }}>
            <ASTViewer src={src} srcPos={srcPos} ast={ast} />
          </Grid>

          <Grid size={6} sx={{ borderRight: "1px solid lightgray" }}>
            <CFGViewer src={src} srcPos={srcPos} cfgs={cfgs} />
          </Grid>
          <Grid size={6}>
            <SSAViewer src={src} srcPos={srcPos} ssa={ssa} />
          </Grid>
        </Grid>
      </Grid>
  );
};

export default App;
