// Package bundle encodes and indexes standard-library export data.
package bundle

import "errors"

const (
	magic      = "GGLSTDL1"
	headerSize = len(magic) + 2
)

// A bundle starts with the magic value, a uint16 Go version length, the Go
// version, and a uint32 package count. Each index entry contains a uint16 path
// length, the path, and uint32 payload offset and length values. All integers
// are little-endian. The indexed export-data payloads follow the complete index.

type Entry struct {
	Path string
	Data []byte
}

type Bundle struct {
	GoVersion string
	Entries   map[string][]byte
}

func Marshal(goVersion string, entries []Entry) ([]byte, error) {
	if goVersion == "" {
		return nil, errors.New("Go version is empty")
	}
	if uint64(len(goVersion)) > uint64(^uint16(0)) {
		return nil, errors.New("Go version is too long")
	}
	indexSize := uint64(headerSize + len(goVersion) + 4)
	payloadSize := uint64(0)
	for _, entry := range entries {
		if entry.Path == "" {
			return nil, errors.New("package path is empty")
		}
		if uint64(len(entry.Path)) > uint64(^uint16(0)) {
			return nil, errors.New("package path is too long")
		}
		if uint64(len(entry.Data)) > uint64(^uint32(0)) {
			return nil, errors.New("package export data is too large")
		}
		indexSize += uint64(2 + len(entry.Path) + 4 + 4)
		payloadSize += uint64(len(entry.Data))
		if indexSize > uint64(^uint32(0)) || payloadSize > uint64(^uint32(0))-indexSize {
			return nil, errors.New("standard library bundle is too large")
		}
	}
	if uint64(len(entries)) > uint64(^uint32(0)) {
		return nil, errors.New("too many packages in standard library bundle")
	}

	bundle := make([]byte, int(indexSize+payloadSize))
	copy(bundle, magic)
	putUint16(bundle[len(magic):], uint16(len(goVersion)))
	copy(bundle[headerSize:], goVersion)
	putUint32(bundle[headerSize+len(goVersion):], uint32(len(entries)))

	indexOffset := headerSize + len(goVersion) + 4
	payloadOffset := int(indexSize)
	for _, entry := range entries {
		putUint16(bundle[indexOffset:], uint16(len(entry.Path)))
		indexOffset += 2
		copy(bundle[indexOffset:], entry.Path)
		indexOffset += len(entry.Path)
		putUint32(bundle[indexOffset:], uint32(payloadOffset))
		indexOffset += 4
		putUint32(bundle[indexOffset:], uint32(len(entry.Data)))
		indexOffset += 4
		copy(bundle[payloadOffset:], entry.Data)
		payloadOffset += len(entry.Data)
	}
	return bundle, nil
}

func Parse(bundle []byte) (*Bundle, error) {
	if len(bundle) < headerSize || string(bundle[:len(magic)]) != magic {
		return nil, errors.New("invalid standard library bundle header")
	}
	goVersionSize := int(readUint16(bundle[len(magic):]))
	if goVersionSize == 0 || len(bundle)-headerSize < goVersionSize+4 {
		return nil, errors.New("invalid standard library bundle Go version")
	}
	goVersion := string(bundle[headerSize : headerSize+goVersionSize])

	type descriptor struct {
		path   string
		offset uint32
		size   uint32
	}
	indexOffset := headerSize + goVersionSize
	count := uint64(readUint32(bundle[indexOffset:]))
	indexOffset += 4
	if count > uint64((len(bundle)-indexOffset)/10) {
		return nil, errors.New("invalid standard library bundle package count")
	}
	descriptors := make([]descriptor, 0, int(count))
	for range count {
		if len(bundle)-indexOffset < 2 {
			return nil, errors.New("truncated standard library bundle index")
		}
		pathSize := int(readUint16(bundle[indexOffset:]))
		indexOffset += 2
		if pathSize == 0 || len(bundle)-indexOffset < pathSize+8 {
			return nil, errors.New("invalid standard library bundle index entry")
		}
		path := string(bundle[indexOffset : indexOffset+pathSize])
		indexOffset += pathSize
		offset := readUint32(bundle[indexOffset:])
		indexOffset += 4
		size := readUint32(bundle[indexOffset:])
		indexOffset += 4
		descriptors = append(descriptors, descriptor{path: path, offset: offset, size: size})
	}

	entries := make(map[string][]byte, len(descriptors))
	payloadOffset := uint64(indexOffset)
	for _, descriptor := range descriptors {
		if payloadOffset > uint64(len(bundle)) ||
			uint64(descriptor.offset) != payloadOffset ||
			uint64(descriptor.size) > uint64(len(bundle))-payloadOffset {
			return nil, errors.New("invalid standard library bundle payload")
		}
		if _, duplicate := entries[descriptor.path]; duplicate {
			return nil, errors.New("duplicate package in standard library bundle")
		}
		payloadEnd := payloadOffset + uint64(descriptor.size)
		entries[descriptor.path] = bundle[payloadOffset:payloadEnd]
		payloadOffset = payloadEnd
	}
	if payloadOffset != uint64(len(bundle)) {
		return nil, errors.New("unexpected data at end of standard library bundle")
	}
	return &Bundle{GoVersion: goVersion, Entries: entries}, nil
}

func putUint16(destination []byte, value uint16) {
	destination[0] = byte(value)
	destination[1] = byte(value >> 8)
}

func putUint32(destination []byte, value uint32) {
	destination[0] = byte(value)
	destination[1] = byte(value >> 8)
	destination[2] = byte(value >> 16)
	destination[3] = byte(value >> 24)
}

func readUint16(source []byte) uint16 {
	return uint16(source[0]) | uint16(source[1])<<8
}

func readUint32(source []byte) uint32 {
	return uint32(source[0]) |
		uint32(source[1])<<8 |
		uint32(source[2])<<16 |
		uint32(source[3])<<24
}
