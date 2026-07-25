import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	sundropVillageBackgroundAlpha
} from './sundrop-village-background';
import {
	finalizeSundropVillagePng,
	normalizeSundropVillageBackground,
	quantizeSundropVillageRgba,
	rasterizeSundropVillageArtControl,
	writeFinalizedSundropVillagePng
} from './sundrop-village-png';

const WIDTH = SUNDROP_VILLAGE_BACKGROUND_WIDTH;
const HEIGHT = SUNDROP_VILLAGE_BACKGROUND_HEIGHT;
const temporaryDirectories: string[] = [];

let opaqueFixture: Buffer;
let metadataFixture: Buffer;
let nonOpaqueFixture: Buffer;
let wrongDimensionsFixture: Buffer;

function expectedAlpha(distance: number): number {
	const t = Math.max(0, Math.min(1, distance / 64));
	return Math.round(255 * (t * t * (3 - 2 * t)));
}

function pngColorType(png: Uint8Array): number {
	return png[25] ?? -1;
}

function pngChunkTypes(png: Buffer): string[] {
	const types: string[] = [];
	let offset = 8;
	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.toString('ascii', offset + 4, offset + 8);
		types.push(type);
		offset += 12 + length;
		if (type === 'IEND') break;
	}
	return types;
}

async function makeTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), 'gliese-sundrop-village-png-'));
	temporaryDirectories.push(directory);
	return directory;
}

beforeAll(async () => {
	const source = sharp({
		create: {
			width: WIDTH,
			height: HEIGHT,
			channels: 4,
			background: { r: 255, g: 126, b: 61, alpha: 1 }
		}
	});

	opaqueFixture = await source.clone().png().toBuffer();
	metadataFixture = await source.clone().withMetadata({ density: 300 }).png().toBuffer();
	nonOpaqueFixture = await sharp({
		create: {
			width: WIDTH,
			height: HEIGHT,
			channels: 4,
			background: { r: 255, g: 126, b: 61, alpha: 0.5 }
		}
	})
		.png()
		.toBuffer();
	wrongDimensionsFixture = await sharp({
		create: {
			width: WIDTH - 1,
			height: HEIGHT,
			channels: 4,
			background: { r: 255, g: 126, b: 61, alpha: 1 }
		}
	})
		.png()
		.toBuffer();
});

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) =>
			rm(directory, {
				recursive: true,
				force: true
			})
		)
	);
});

describe('Sundrop Village background edge alpha', () => {
	it('makes every pixel on all four outer edges transparent', () => {
		for (let x = 0; x < WIDTH; x += 1) {
			expect(sundropVillageBackgroundAlpha(x, 0)).toBe(0);
			expect(sundropVillageBackgroundAlpha(x, HEIGHT - 1)).toBe(0);
		}
		for (let y = 0; y < HEIGHT; y += 1) {
			expect(sundropVillageBackgroundAlpha(0, y)).toBe(0);
			expect(sundropVillageBackgroundAlpha(WIDTH - 1, y)).toBe(0);
		}
	});

	it('is fully opaque at and beyond distance 64', () => {
		expect(sundropVillageBackgroundAlpha(64, 64)).toBe(255);
		expect(sundropVillageBackgroundAlpha(65, 65)).toBe(255);
		expect(sundropVillageBackgroundAlpha(WIDTH / 2, HEIGHT / 2)).toBe(255);
	});

	it.each([
		{ distance: 0, alpha: 0 },
		{ distance: 16, alpha: 40 },
		{ distance: 32, alpha: 128 },
		{ distance: 48, alpha: 215 },
		{ distance: 64, alpha: 255 }
	])('matches the pinned smoothstep at distance $distance', ({ distance, alpha }) => {
		expect(sundropVillageBackgroundAlpha(distance, HEIGHT / 2)).toBe(alpha);
	});

	it('is monotonic along every inward edge normal', () => {
		for (let distance = 1; distance <= 64; distance += 1) {
			const previous = expectedAlpha(distance - 1);
			expect(sundropVillageBackgroundAlpha(distance, HEIGHT / 2)).toBeGreaterThanOrEqual(previous);
			expect(
				sundropVillageBackgroundAlpha(WIDTH - 1 - distance, HEIGHT / 2)
			).toBeGreaterThanOrEqual(previous);
			expect(sundropVillageBackgroundAlpha(WIDTH / 2, distance)).toBeGreaterThanOrEqual(previous);
			expect(
				sundropVillageBackgroundAlpha(WIDTH / 2, HEIGHT - 1 - distance)
			).toBeGreaterThanOrEqual(previous);
		}
	});

	it('never jumps more than 32 alpha levels between adjacent pixels', () => {
		let maximumJump = 0;
		for (let distance = 1; distance <= 64; distance += 1) {
			maximumJump = Math.max(
				maximumJump,
				sundropVillageBackgroundAlpha(distance, HEIGHT / 2) -
					sundropVillageBackgroundAlpha(distance - 1, HEIGHT / 2)
			);
		}

		expect(maximumJump).toBeLessThanOrEqual(32);
	});
});

describe('Sundrop Village deterministic PNG pipeline', () => {
	it('rejects source images with the wrong dimensions', async () => {
		await expect(finalizeSundropVillagePng(wrongDimensionsFixture, 0)).rejects.toThrow(
			'exactly 1792x1536'
		);
	});

	it('rejects any source pixel that is not fully opaque', async () => {
		await expect(finalizeSundropVillagePng(nonOpaqueFixture, 0)).rejects.toThrow('fully opaque');
	});

	it('derives every tier independently without mutating the untouched source', () => {
		const source = Buffer.from([255, 126, 61, 255, 17, 34, 51, 255]);
		const original = Buffer.from(source);

		const tier1 = quantizeSundropVillageRgba(source, 1, 2, 1);
		const tier3 = quantizeSundropVillageRgba(source, 3, 2, 1);
		const tier2 = quantizeSundropVillageRgba(source, 2, 2, 1);

		expect(source).toEqual(original);
		expect([...tier1]).toEqual([254, 126, 60, 0, 16, 34, 50, 0]);
		expect([...tier2]).toEqual([252, 124, 60, 0, 16, 32, 48, 0]);
		expect([...tier3]).toEqual([248, 120, 56, 0, 16, 32, 48, 0]);
	});

	it('strips source metadata and writes truecolor RGBA PNG output', async () => {
		const inputMetadata = await sharp(metadataFixture).metadata();
		const result = await finalizeSundropVillagePng(metadataFixture, 0);
		const outputMetadata = await sharp(result.png).metadata();

		expect(inputMetadata.density).toBe(300);
		expect(pngChunkTypes(metadataFixture)).toContain('pHYs');
		expect(pngChunkTypes(result.png)).not.toContain('pHYs');
		expect(outputMetadata.format).toBe('png');
		expect(outputMetadata.width).toBe(WIDTH);
		expect(outputMetadata.height).toBe(HEIGHT);
		expect(outputMetadata.channels).toBe(4);
		expect(outputMetadata.depth).toBe('uchar');
		expect(outputMetadata.hasAlpha).toBe(true);
		expect(pngColorType(result.png)).toBe(6);
	});

	it('recomputes and matches every output alpha byte', async () => {
		const result = await finalizeSundropVillagePng(opaqueFixture, 0);
		const { data, info } = await sharp(result.png)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const mismatches: Array<{ x: number; y: number; actual: number; expected: number }> = [];

		for (let y = 0; y < HEIGHT; y += 1) {
			for (let x = 0; x < WIDTH; x += 1) {
				const distance = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y);
				const expected = expectedAlpha(distance);
				const actual = data[(y * WIDTH + x) * 4 + 3] ?? -1;
				if (actual !== expected && mismatches.length === 0) {
					mismatches.push({ x, y, actual, expected });
				}
			}
		}

		expect(info.channels).toBe(4);
		expect(mismatches).toEqual([]);
	});

	it('produces identical bytes and SHA-256 for identical input, tier, and arguments', async () => {
		const first = await finalizeSundropVillagePng(opaqueFixture, 2);
		const second = await finalizeSundropVillagePng(opaqueFixture, 2);
		const independentlyHashed = createHash('sha256').update(first.png).digest('hex');

		expect(second.png).toEqual(first.png);
		expect(second.sha256).toBe(first.sha256);
		expect(first.sha256).toBe(independentlyHashed);
		expect(first.bytes).toBe(first.png.byteLength);
	});

	it('does not replace an existing output when source validation fails', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'invalid.png');
		const output = join(directory, 'existing.png');
		const sentinel = Buffer.from('approved-existing-output');
		await writeFile(input, wrongDimensionsFixture);
		await writeFile(output, sentinel);

		await expect(writeFinalizedSundropVillagePng({ input, output, tier: 0 })).rejects.toThrow(
			'exactly 1792x1536'
		);

		expect(await readFile(output)).toEqual(sentinel);
	});

	it('does not replace an existing output when the encoded hard budget is exceeded', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'valid.png');
		const output = join(directory, 'existing.png');
		const sentinel = Buffer.from('approved-existing-output');
		await writeFile(input, opaqueFixture);
		await writeFile(output, sentinel);

		await expect(
			writeFinalizedSundropVillagePng({
				input,
				output,
				tier: 0,
				maxBytes: 1
			})
		).rejects.toThrow('exceeds the 1-byte hard limit');

		expect(await readFile(output)).toEqual(sentinel);
	});
});

describe('Sundrop Village PNG preprocessing', () => {
	it('rasterizes only the named combined art control at the exact regional dimensions', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'village-art-control.svg');
		const output = join(directory, 'reference.png');
		await writeFile(
			input,
			`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#123456"/></svg>`
		);

		await rasterizeSundropVillageArtControl({ input, output });
		const metadata = await sharp(output).metadata();

		expect(metadata.width).toBe(WIDTH);
		expect(metadata.height).toBe(HEIGHT);
		expect(metadata.channels).toBe(4);
		expect(pngColorType(await readFile(output))).toBe(6);
	});

	it('rejects any SVG input not named village-art-control.svg', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'other-control.svg');
		const output = join(directory, 'reference.png');
		await writeFile(
			input,
			`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"/>`
		);

		await expect(rasterizeSundropVillageArtControl({ input, output })).rejects.toThrow(
			'must be named village-art-control.svg'
		);
	});

	it('rejects non-7:6 and out-of-bounds normalization crops', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'candidate.png');
		const output = join(directory, 'normalized.png');
		const transformOutput = join(directory, 'transform.json');
		const candidate = await sharp({
			create: {
				width: 140,
				height: 120,
				channels: 4,
				background: { r: 12, g: 34, b: 56, alpha: 1 }
			}
		})
			.png()
			.toBuffer();
		await writeFile(input, candidate);

		await expect(
			normalizeSundropVillageBackground({
				input,
				output,
				transformOutput,
				crop: { x: 0, y: 0, width: 70, height: 70 }
			})
		).rejects.toThrow('exactly 7:6');
		await expect(
			normalizeSundropVillageBackground({
				input,
				output,
				transformOutput,
				crop: { x: 80, y: 0, width: 70, height: 60 }
			})
		).rejects.toThrow('falls outside');
	});

	it('records native dimensions, crop, and one uniform scale in a JSON sidecar', async () => {
		const directory = await makeTemporaryDirectory();
		const input = join(directory, 'candidate.png');
		const output = join(directory, 'normalized.png');
		const transformOutput = join(directory, 'transform.json');
		const candidate = await sharp({
			create: {
				width: 140,
				height: 120,
				channels: 4,
				background: { r: 12, g: 34, b: 56, alpha: 1 }
			}
		})
			.png()
			.toBuffer();
		await writeFile(input, candidate);

		const transform = await normalizeSundropVillageBackground({
			input,
			output,
			transformOutput,
			crop: { x: 35, y: 30, width: 70, height: 60 }
		});
		const persistedTransform = JSON.parse(await readFile(transformOutput, 'utf8')) as unknown;
		const metadata = await sharp(output).metadata();

		expect(transform).toEqual({
			native: { width: 140, height: 120 },
			crop: { x: 35, y: 30, width: 70, height: 60 },
			output: { width: WIDTH, height: HEIGHT },
			scale: 25.6
		});
		expect(persistedTransform).toEqual(transform);
		expect(metadata.width).toBe(WIDTH);
		expect(metadata.height).toBe(HEIGHT);
		expect(metadata.channels).toBe(4);
		expect(pngColorType(await readFile(output))).toBe(6);
	});
});
