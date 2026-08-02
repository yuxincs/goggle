package ide

import (
	"fmt"
	"unicode/utf16"
	"unicode/utf8"
)

func offsetForPosition(source string, position Position) (int, error) {
	if position.Line < 0 || position.Character < 0 {
		return 0, fmt.Errorf("invalid position %d:%d", position.Line, position.Character)
	}

	line := 0
	lineStart := 0
	for index, character := range source {
		if line == position.Line {
			lineStart = index
			break
		}
		if character == '\n' {
			line++
			lineStart = index + 1
		}
	}
	if position.Line > line {
		return 0, fmt.Errorf("line %d is outside the document", position.Line)
	}

	units := 0
	for offset, character := range source[lineStart:] {
		if character == '\n' {
			break
		}
		if units == position.Character {
			return lineStart + offset, nil
		}
		units += utf16.RuneLen(character)
		if units > position.Character {
			return 0, fmt.Errorf("character %d splits a UTF-16 surrogate pair", position.Character)
		}
	}
	if units == position.Character {
		return lineStart + lenLine(source[lineStart:]), nil
	}
	return 0, fmt.Errorf("character %d is outside line %d", position.Character, position.Line)
}

func positionForOffset(source string, offset int) (Position, error) {
	if offset < 0 || offset > len(source) || !utf8.ValidString(source[:offset]) {
		return Position{}, fmt.Errorf("invalid source offset %d", offset)
	}

	position := Position{}
	for _, character := range source[:offset] {
		if character == '\n' {
			position.Line++
			position.Character = 0
			continue
		}
		position.Character += utf16.RuneLen(character)
	}
	return position, nil
}

func lenLine(source string) int {
	for index, character := range source {
		if character == '\n' {
			return index
		}
	}
	return len(source)
}
