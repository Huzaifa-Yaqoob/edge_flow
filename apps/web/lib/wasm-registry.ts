// lib/wasm-registry.ts
import init from "@workspace/core-wasm/pkg"

let wasmPromise: Promise<any> | null = null

export const getWasm = () => {
  if (!wasmPromise) {
    // This ensures that no matter how many hooks call this,
    // the .wasm file is only fetched and compiled ONCE.
    wasmPromise = init()
  }
  return wasmPromise
}
