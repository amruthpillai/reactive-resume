export type ZipEntry = { path: string; content: string };

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index++) {
		let value = index;
		for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		table[index] = value >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

// A fixed DOS timestamp (1980-01-01) keeps the archive byte-identical for the same input, which makes it testable.
const DOS_TIME = 0;
const DOS_DATE = 33;

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;

/**
 * Writes an OpenDocument ZIP archive. Entries are stored uncompressed so the format needs no
 * compression library and works in the browser and on the server. ODF requires `mimetype` to be
 * the first entry and uncompressed, so callers must pass it first (see `buildOdtFiles`).
 */
export function createZip(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
	const local: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.path);
		const data = encoder.encode(entry.content);
		const crc = crc32(data);

		const header = new Uint8Array(LOCAL_HEADER_SIZE + name.length);
		const headerView = new DataView(header.buffer);
		headerView.setUint32(0, 0x04034b50, true); // local file header signature
		headerView.setUint16(4, 20, true); // version needed to extract
		headerView.setUint16(6, 0, true); // general purpose flags
		headerView.setUint16(8, 0, true); // compression method: stored
		headerView.setUint16(10, DOS_TIME, true);
		headerView.setUint16(12, DOS_DATE, true);
		headerView.setUint32(14, crc, true);
		headerView.setUint32(18, data.length, true); // compressed size
		headerView.setUint32(22, data.length, true); // uncompressed size
		headerView.setUint16(26, name.length, true);
		headerView.setUint16(28, 0, true); // extra field length
		header.set(name, LOCAL_HEADER_SIZE);
		local.push(header, data);

		const directory = new Uint8Array(CENTRAL_HEADER_SIZE + name.length);
		const directoryView = new DataView(directory.buffer);
		directoryView.setUint32(0, 0x02014b50, true); // central directory header signature
		directoryView.setUint16(4, 20, true); // version made by
		directoryView.setUint16(6, 20, true); // version needed to extract
		directoryView.setUint16(8, 0, true);
		directoryView.setUint16(10, 0, true);
		directoryView.setUint16(12, DOS_TIME, true);
		directoryView.setUint16(14, DOS_DATE, true);
		directoryView.setUint32(16, crc, true);
		directoryView.setUint32(20, data.length, true);
		directoryView.setUint32(24, data.length, true);
		directoryView.setUint16(28, name.length, true);
		directoryView.setUint16(30, 0, true); // extra field length
		directoryView.setUint16(32, 0, true); // comment length
		directoryView.setUint16(34, 0, true); // disk number start
		directoryView.setUint16(36, 0, true); // internal attributes
		directoryView.setUint32(38, 0, true); // external attributes
		directoryView.setUint32(42, offset, true); // relative offset of local header
		directory.set(name, CENTRAL_HEADER_SIZE);
		central.push(directory);

		offset += header.length + data.length;
	}

	const centralSize = central.reduce((size, part) => size + part.length, 0);

	const eocd = new Uint8Array(EOCD_SIZE);
	const eocdView = new DataView(eocd.buffer);
	eocdView.setUint32(0, 0x06054b50, true); // end of central directory signature
	eocdView.setUint16(4, 0, true); // disk number
	eocdView.setUint16(6, 0, true); // disk with central directory
	eocdView.setUint16(8, entries.length, true);
	eocdView.setUint16(10, entries.length, true);
	eocdView.setUint32(12, centralSize, true);
	eocdView.setUint32(16, offset, true);
	eocdView.setUint16(20, 0, true); // comment length

	const parts = [...local, ...central, eocd];
	const total = parts.reduce((size, part) => size + part.length, 0);
	const archive = new Uint8Array(total);
	let cursor = 0;
	for (const part of parts) {
		archive.set(part, cursor);
		cursor += part.length;
	}
	return archive;
}
