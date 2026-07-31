package cfg_test

import (
	"bytes"
	"encoding/json"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"testing"

	cfganalysis "github.com/yuxincs/goggle/cfg"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	if err != nil {
		t.Fatalf("parse input: %v", err)
	}

	actual, err := json.MarshalIndent(cfganalysis.Analyze(fset, file), "", "  ")
	if err != nil {
		t.Fatalf("marshal CFG: %v", err)
	}
	actual = append(actual, '\n')

	assertGolden(t, filepath.Join("testdata", "foo.expected.json"), actual)
}

func assertGolden(t *testing.T, path string, actual []byte) {
	t.Helper()

	expected, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden file: %v\nactual:\n%s", err, actual)
	}
	if !bytes.Equal(actual, expected) {
		t.Errorf("golden file mismatch\nexpected:\n%s\nactual:\n%s", expected, actual)
	}
}
