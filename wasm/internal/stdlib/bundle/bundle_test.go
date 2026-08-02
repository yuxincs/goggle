package bundle

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoundTrip(t *testing.T) {
	t.Parallel()

	entries := []Entry{
		{Path: "bytes", Data: []byte("bytes export data")},
		{Path: "go/ast", Data: []byte("ast export data")},
	}
	bundle, err := Marshal("go1.26", entries)
	require.NoError(t, err, "marshal bundle")
	actual, err := Parse(bundle)
	require.NoError(t, err, "parse bundle")
	require.Equal(t, "go1.26", actual.GoVersion)
	for _, entry := range entries {
		require.Equal(t, entry.Data, actual.Entries[entry.Path], "entry %q", entry.Path)
	}
}

func TestParseRejectsInvalidBundle(t *testing.T) {
	t.Parallel()

	_, err := Parse([]byte("not a bundle"))
	require.Error(t, err)
}
