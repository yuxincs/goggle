package ide

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPositionRoundTrip(t *testing.T) {
	t.Parallel()

	const source = "α😀z\nnext"
	tests := []struct {
		position Position
		offset   int
	}{
		{position: Position{Line: 0, Character: 0}, offset: 0},
		{position: Position{Line: 0, Character: 1}, offset: len("α")},
		{position: Position{Line: 0, Character: 3}, offset: len("α😀")},
		{position: Position{Line: 1, Character: 2}, offset: len("α😀z\nne")},
	}

	for _, test := range tests {
		offset, err := offsetForPosition(source, test.position)
		require.NoError(t, err)
		require.Equal(t, test.offset, offset)

		position, err := positionForOffset(source, offset)
		require.NoError(t, err)
		require.Equal(t, test.position, position)
	}
}
