import wasmModule from './webpxmux.wasm';
import createModule from 'webpxmux/lib/build/webpxmux.js';

// =====================================================
// WASM SINGLETON
// =====================================================
let modulePromise = null;

function getModule() {
	if (modulePromise) return modulePromise;

	modulePromise = createModule({
		instantiateWasm(imports, successCallback) {
			const instance = new WebAssembly.Instance(wasmModule, imports);
			successCallback(instance);
			return instance.exports;
		}
	}).then(Module => {
		Module._encodeFrames = Module.cwrap('encodeFrames', 'number', ['number']);
		return Module;
	});

	return modulePromise;
}

// =====================================================
// CONSTANTS (matching webpxmux wrapper)
// =====================================================
const SIZE_IU8 = 1;
const SIZE_IU32 = 4;
const FBS_HEADER = 6;
const FBS_FRAME_HEADER = 2;

// =====================================================
// HELPERS
// =====================================================
function getUnsigned(Module, ptr, typeByteSize) {
	const bitSize = typeByteSize * 8;
	return Module.getValue(ptr, `i${bitSize}`) >>> 0;
}

function copyFBSToHeap(Module, frames) {
	const perFU32count = FBS_FRAME_HEADER + frames.width * frames.height;
	const u32count = FBS_HEADER + frames.frameCount * perFU32count;
	const ptr = Module._malloc(u32count * SIZE_IU32);

	const u32a = new Uint32Array(u32count);
	u32a[0] = frames.frameCount;
	u32a[1] = frames.frameCount;
	u32a[2] = frames.width;
	u32a[3] = frames.height;
	u32a[4] = frames.loopCount;
	u32a[5] = frames.bgColor;

	for (let i = 0; i < frames.frames.length; i++) {
		const fr = frames.frames[i];
		const offset = FBS_HEADER + i * perFU32count;
		u32a[offset] = fr.duration;
		u32a[offset + 1] = fr.isKeyframe ? 1 : 0;
		u32a.set(fr.rgba, offset + FBS_FRAME_HEADER);
	}

	const heapView = new Uint32Array(Module.HEAPU32.buffer, ptr, u32count);
	heapView.set(u32a);
	return ptr;
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Encode multiple RGBA frames into an animated WebP.
 *
 * @param {Object} options
 * @param {Uint8Array[]} options.frames    - Array of RGBA Uint8Array pixel data
 * @param {number[]}     options.frameDurations - Duration per frame in ms
 * @param {number}       options.width
 * @param {number}       options.height
 * @param {number}       [options.loopCount=0] - 0 = infinite loop
 * @returns {Promise<Uint8Array>} Encoded WebP binary
 */
export async function encodeAnimatedWebP({ frames, frameDurations, width, height, loopCount = 0 }) {
	const Module = await getModule();

	// Convert RGBA Uint8Array frames to Uint32Array (packed RGBA)
	const u32Frames = frames.map(frame => {
		if (frame instanceof Uint32Array) return frame;
		return new Uint32Array(frame.buffer, frame.byteOffset, frame.byteLength / 4);
	});

	const fbsData = {
		frameCount: u32Frames.length,
		width,
		height,
		loopCount,
		bgColor: 0,
		frames: u32Frames.map((rgba, i) => ({
			duration: frameDurations[i],
			isKeyframe: i === 0,
			rgba,
		})),
	};

	const bsPtr = copyFBSToHeap(Module, fbsData);
	const encodedPtr = Module._encodeFrames(bsPtr);
	Module._free(bsPtr);

	if (encodedPtr < 0) {
		const errors = {
			[-20]: "failed to encode the image",
			[-30]: "failed to allocate a Mux object",
			[-31]: "failed to parse frame properties",
			[-32]: "failed to add a frame",
			[-33]: "failed to set animation parameters",
			[-34]: "failed to assembly the WebP image",
		};
		throw new Error(errors[encodedPtr] || `WebP encoding failed with code ${encodedPtr}`);
	}

	// Read encoded size (first SIZE_IU32 bytes at encodedPtr)
	const sizeT = SIZE_IU32; // sizeof(size_t) on wasm32
	const size = getUnsigned(Module, encodedPtr, sizeT);

	// Read encoded bytes
	const result = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		result[i] = Module.HEAPU8[encodedPtr + SIZE_IU32 + i];
	}

	Module._free(encodedPtr);
	return result;
}
