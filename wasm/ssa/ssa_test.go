package ssa_test

import (
	"bytes"
	"encoding/json"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"testing"

	ssaanalysis "github.com/yuxincs/goggle/ssa"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	if err != nil {
		t.Fatalf("parse input: %v", err)
	}

	actualResult, err := ssaanalysis.Analyze(fset, file)
	if err != nil {
		t.Fatalf("analyze SSA: %v", err)
	}
	actual, err := json.MarshalIndent(actualResult, "", "  ")
	if err != nil {
		t.Fatalf("marshal SSA: %v", err)
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
