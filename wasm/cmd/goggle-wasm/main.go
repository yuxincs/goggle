//go:build js && wasm

package main

import (
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/yuxincs/goggle/analyzer"
	"github.com/yuxincs/goggle/ide"
)

func main() {
	js.Global().Set("parse", js.FuncOf(func(this js.Value, args []js.Value) (output any) {
		defer func() {
			if recovered := recover(); recovered != nil {
				output = js.ValueOf(map[string]interface{}{
					"error": fmt.Sprintf("%s", recovered),
				})
			}
		}()

		if len(args) != 1 {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected 1 argument, got %d", len(args)),
			})
		}
		if args[0].Type() != js.TypeString {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected a string, got %s", args[0].Type()),
			})
		}

		result, err := analyzer.Analyze(args[0].String())
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		data, err := json.Marshal(result)
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		return js.ValueOf(map[string]interface{}{
			"body": string(data),
		})
	}))

	ideService := ide.NewService()
	js.Global().Set("ide", js.FuncOf(func(this js.Value, args []js.Value) (output any) {
		defer func() {
			if recovered := recover(); recovered != nil {
				output = js.ValueOf(map[string]interface{}{
					"error": fmt.Sprintf("%s", recovered),
				})
			}
		}()

		if len(args) != 1 {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected 1 argument, got %d", len(args)),
			})
		}
		if args[0].Type() != js.TypeString {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected a string, got %s", args[0].Type()),
			})
		}

		var request ide.Request
		if err := json.Unmarshal([]byte(args[0].String()), &request); err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("decode IDE request: %s", err),
			})
		}
		result, err := ideService.Handle(request)
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		data, err := json.Marshal(result)
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		return js.ValueOf(map[string]interface{}{
			"body": string(data),
		})
	}))

	// Wait forever to keep the Go WebAssembly module running.
	<-make(chan struct{})
}
