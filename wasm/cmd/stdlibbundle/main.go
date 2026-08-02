package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"go/token"
	"go/types"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"

	"github.com/yuxincs/goggle/stdlib/bundle"
	"golang.org/x/tools/go/gcexportdata"
)

type listedPackage struct {
	ImportPath string
	Export     string
}

func main() {
	output := flag.String("output", "stdlib.bundle", "output path for the generated standard library bundle")
	flag.Parse()

	packages, err := listStandardLibrary()
	if err != nil {
		log.Fatal(err)
	}
	if err := writeBundle(*output, packages); err != nil {
		log.Fatal(err)
	}
}

func listStandardLibrary() ([]listedPackage, error) {
	command := exec.Command("go", "list", "-e", "-export", "-trimpath", "-json", "std")
	command.Env = targetEnvironment(os.Environ())
	output, err := command.Output()
	if err != nil {
		return nil, fmt.Errorf("list standard library: %w", err)
	}

	decoder := json.NewDecoder(bytes.NewReader(output))
	packages := make([]listedPackage, 0)
	for {
		var pkg listedPackage
		err := decoder.Decode(&pkg)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("decode package list: %w", err)
		}
		if pkg.ImportPath != "" && pkg.Export != "" && isPublicPackage(pkg.ImportPath) {
			packages = append(packages, pkg)
		}
	}
	sort.Slice(packages, func(left, right int) bool {
		return packages[left].ImportPath < packages[right].ImportPath
	})
	return packages, nil
}

func isPublicPackage(importPath string) bool {
	for _, component := range strings.Split(importPath, "/") {
		if component == "internal" || component == "vendor" {
			return false
		}
	}
	return true
}

func targetEnvironment(environment []string) []string {
	target := make([]string, 0, len(environment)+3)
	for _, value := range environment {
		if strings.HasPrefix(value, "GOOS=") ||
			strings.HasPrefix(value, "GOARCH=") ||
			strings.HasPrefix(value, "CGO_ENABLED=") {
			continue
		}
		target = append(target, value)
	}
	return append(target, "GOOS=js", "GOARCH=wasm", "CGO_ENABLED=0")
}

func writeBundle(output string, packages []listedPackage) (returnError error) {
	directory := filepath.Dir(output)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}
	temporary, err := os.CreateTemp(directory, ".stdlib-*.bundle")
	if err != nil {
		return fmt.Errorf("create temporary bundle: %w", err)
	}
	temporaryPath := temporary.Name()
	defer temporary.Close()
	defer func() {
		if err := os.Remove(temporaryPath); err != nil && !os.IsNotExist(err) && returnError == nil {
			returnError = fmt.Errorf("remove temporary bundle: %w", err)
		}
	}()

	fset := token.NewFileSet()
	entries := make([]bundle.Entry, 0, len(packages))
	for _, pkg := range packages {
		definition, err := readPackageDefinition(fset, pkg)
		if err != nil {
			return fmt.Errorf("read %s export data: %w", pkg.ImportPath, err)
		}
		entries = append(entries, bundle.Entry{Path: pkg.ImportPath, Data: definition})
	}
	encoded, err := bundle.Marshal(runtime.Version(), entries)
	if err != nil {
		return fmt.Errorf("encode bundle: %w", err)
	}
	if _, err := temporary.Write(encoded); err != nil {
		return fmt.Errorf("write bundle: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close temporary bundle: %w", err)
	}
	if err := os.Chmod(temporaryPath, 0o644); err != nil {
		return fmt.Errorf("set bundle permissions: %w", err)
	}
	if err := os.Rename(temporaryPath, output); err != nil {
		return fmt.Errorf("install bundle: %w", err)
	}
	return nil
}

func readPackageDefinition(
	fset *token.FileSet,
	pkg listedPackage,
) ([]byte, error) {
	file, err := os.Open(pkg.Export)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	reader, err := gcexportdata.NewReader(file)
	if err != nil {
		return nil, err
	}
	typesPackage, err := gcexportdata.Read(
		reader,
		fset,
		make(map[string]*types.Package),
		pkg.ImportPath,
	)
	if err != nil {
		return nil, err
	}

	var definition bytes.Buffer
	if err := gcexportdata.Write(&definition, fset, typesPackage); err != nil {
		return nil, err
	}
	return definition.Bytes(), nil
}
