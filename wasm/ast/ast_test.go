package ast_test

import (
	"encoding/json"
	"go/parser"
	"go/token"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	astanalysis "github.com/yuxincs/goggle/ast"
	"github.com/yuxincs/goggle/internal/goggletest"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	require.NoError(t, err, "parse input")

	actual, err := json.MarshalIndent(astanalysis.Analyze(fset, file), "", "  ")
	require.NoError(t, err, "marshal AST")
	actual = append(actual, '\n')

	goggletest.AssertGolden(
		t,
		filepath.Join("testdata", "foo.expected.json"),
		actual,
	)
}
