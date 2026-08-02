package ssa_test

import (
	"encoding/json"
	"go/parser"
	"go/token"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/goggletest"
	ssaanalysis "github.com/yuxincs/goggle/ssa"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	require.NoError(t, err, "parse input")

	actualResult, err := ssaanalysis.Analyze(fset, file)
	require.NoError(t, err, "analyze SSA")
	actual, err := json.MarshalIndent(actualResult, "", "  ")
	require.NoError(t, err, "marshal SSA")
	actual = append(actual, '\n')

	goggletest.AssertGolden(
		t,
		filepath.Join("testdata", "foo.expected.json"),
		actual,
	)
}
