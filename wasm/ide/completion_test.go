package ide_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/ide"
)

func TestCompletion(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		source   string
		position ide.Position
		want     string
	}{
		{
			name: "local variable",
			source: `package main

func main() {
	value := 1
	val
}
`,
			position: ide.Position{Line: 4, Character: 4},
			want:     "value",
		},
		{
			name: "standard library selector",
			source: `package main

import "fmt"

func main() {
	fmt.Pr
}
`,
			position: ide.Position{Line: 5, Character: 7},
			want:     "Println",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			service := ide.NewService()
			document := ide.Document{
				URI:     "main.go",
				Source:  test.source,
				Version: 1,
			}
			require.NoError(t, service.Update(document))
			completion, err := service.Complete(ide.DocumentPosition{
				URI:      document.URI,
				Version:  document.Version,
				Position: test.position,
			})
			require.NoError(t, err)

			labels := make([]string, 0, len(completion.Items))
			for _, item := range completion.Items {
				labels = append(labels, item.Label)
			}
			require.Contains(t, labels, test.want)
		})
	}
}
