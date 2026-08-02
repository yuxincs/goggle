package analyzer_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/analyzer"
)

func TestAnalyze(t *testing.T) {
	t.Parallel()

	result, err := analyzer.Analyze(`package main

func main() {
	println("hello")
}
`)
	require.NoError(t, err)
	require.Equal(t, "File", result.AST.Type)
	require.Len(t, result.CFGs, 1)
	require.Equal(t, "main", result.CFGs[0].Name)
	require.Len(t, result.SSA, 1)
	require.Equal(t, "main", result.SSA[0].Name)
}
