package goggletest

import (
	"bytes"
	"os"
	"testing"
)

func AssertGolden(t testing.TB, path string, actual []byte) {
	t.Helper()

	expected, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden file: %v\nactual:\n%s", err, actual)
	}
	if !bytes.Equal(actual, expected) {
		t.Errorf("golden file mismatch\nexpected:\n%s\nactual:\n%s", expected, actual)
	}
}
