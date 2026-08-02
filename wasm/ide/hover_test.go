package ide_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/ide"
)

func TestHover(t *testing.T) {
	t.Parallel()

	const source = `package main

func add(left, right int) int { return left + right }

func main() {
	_ = add(1, 2)
}
`
	service := ide.NewService()
	document := ide.Document{URI: "main.go", Source: source, Version: 1}
	require.NoError(t, service.Update(document))

	hover, err := service.Hover(ide.DocumentPosition{
		URI:      document.URI,
		Version:  document.Version,
		Position: ide.Position{Line: 5, Character: 5},
	})
	require.NoError(t, err)
	require.NotNil(t, hover)
	require.Equal(t, "func add(left int, right int) int", hover.Contents)
	require.Equal(t, ide.Range{
		Start: ide.Position{Line: 5, Character: 5},
		End:   ide.Position{Line: 5, Character: 8},
	}, *hover.Range)
}
