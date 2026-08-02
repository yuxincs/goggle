package ide_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/ide"
)

func TestSignatureHelp(t *testing.T) {
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

	help, err := service.SignatureHelp(ide.DocumentPosition{
		URI:      document.URI,
		Version:  document.Version,
		Position: ide.Position{Line: 5, Character: 12},
	})
	require.NoError(t, err)
	require.Equal(t, &ide.SignatureHelp{
		Signatures: []ide.SignatureInformation{
			{
				Label: "add(left int, right int) int",
				Parameters: []ide.ParameterInformation{
					{Label: "left int"},
					{Label: "right int"},
				},
			},
		},
		ActiveSignature: 0,
		ActiveParameter: 1,
	}, help)
}
