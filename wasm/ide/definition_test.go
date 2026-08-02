package ide_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/ide"
)

func TestDefinition(t *testing.T) {
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

	definition, err := service.Definition(ide.DocumentPosition{
		URI:      document.URI,
		Version:  document.Version,
		Position: ide.Position{Line: 5, Character: 5},
	})
	require.NoError(t, err)
	require.Equal(t, &ide.Location{
		URI: document.URI,
		Range: ide.Range{
			Start: ide.Position{Line: 2, Character: 5},
			End:   ide.Position{Line: 2, Character: 8},
		},
	}, definition)
}
