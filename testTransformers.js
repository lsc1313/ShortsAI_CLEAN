import { env } from "@huggingface/transformers";

console.log("===== Transformers =====");

console.log("Version OK");

console.log("WASM:", env.backends.onnx?.wasm);

console.log("===== SUCCESS =====");
