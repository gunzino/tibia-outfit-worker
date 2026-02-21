export function parseTar(buffer) {
	const files = new Map();
	const decoder = new TextDecoder();
	const bytes = buffer instanceof Uint8Array
		? buffer
		: new Uint8Array(buffer);

	let offset = 0;

	while (offset + 512 <= bytes.length) {
		// If first byte is zero → empty header → end of archive
		if (bytes[offset] === 0) break;

		// File name (first 100 bytes)
		const name = decoder
			.decode(bytes.subarray(offset, offset + 100))
			.replace(/\0.*$/, "");

		// File size (octal string at bytes 124–135)
		const sizeOctal = decoder
			.decode(bytes.subarray(offset + 124, offset + 136))
			.replace(/\0.*$/, "")
			.trim();

		const size = parseInt(sizeOctal || "0", 8);

		const fileStart = offset + 512;
		const fileEnd = fileStart + size;

		if (fileEnd > bytes.length) {
			throw new Error("Invalid TAR: file exceeds archive size");
		}

		files.set(name, bytes.subarray(fileStart, fileEnd));

		// Move to next 512-aligned block
		offset = fileStart + ((size + 511) & ~511);
	}

	return files;
}
