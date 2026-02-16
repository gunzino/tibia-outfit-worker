export function parseTar(buffer) {
	const files = new Map();
	const decoder = new TextDecoder();
	const bytes = buffer instanceof Uint8Array
		? buffer
		: new Uint8Array(buffer);

	let offset = 0;

	while (offset + 512 <= bytes.length) {
		const header = bytes.subarray(offset, offset + 512);

		// If header is all zero → end of archive
		let empty = true;
		for (let i = 0; i < 512; i++) {
			if (header[i] !== 0) {
				empty = false;
				break;
			}
		}
		if (empty) break;

		// File name (first 100 bytes)
		const name = decoder
			.decode(header.subarray(0, 100))
			.replace(/\0.*$/, "");

		// File size (octal string at bytes 124–135)
		const sizeOctal = decoder
			.decode(header.subarray(124, 136))
			.replace(/\0.*$/, "")
			.trim();

		const size = parseInt(sizeOctal || "0", 8);

		const fileStart = offset + 512;
		const fileEnd = fileStart + size;

		if (fileEnd > bytes.length) {
			throw new Error("Invalid TAR: file exceeds archive size");
		}

		const fileData = bytes.subarray(fileStart, fileEnd);

		files.set(name, fileData);

		// Move to next 512-aligned block
		offset = fileStart + Math.ceil(size / 512) * 512;
	}

	return files;
}
