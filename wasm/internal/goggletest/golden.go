package goggletest

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func AssertGolden(t testing.TB, path string, actual []byte) {
	t.Helper()

	expected, err := os.ReadFile(path)
	require.NoError(t, err, "read golden file\nactual:\n%s", actual)
	require.Equal(t, expected, actual, "golden file mismatch")
}
