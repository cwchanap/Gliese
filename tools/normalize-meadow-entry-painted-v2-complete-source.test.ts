import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	normalizeMeadowEntryPaintedV2CompleteSource,
	parseMeadowEntryPaintedV2CompleteSourceArguments
} from './normalize-meadow-entry-painted-v2-complete-source';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks
} from '../src/lib/game/content/backgrounds/meadow-entry-png';

describe('complete Meadow Entry source normalization', () => {
	it('parses exactly one declared panel and raw input path', () => {
		expect(
			parseMeadowEntryPaintedV2CompleteSourceArguments([
				'--panel=north-west',
				'--input=/tmp/native.png'
			])
		).toEqual({ panelId: 'north-west', inputPath: '/tmp/native.png' });
		expect(() =>
			parseMeadowEntryPaintedV2CompleteSourceArguments([
				'--panel=not-a-panel',
				'--input=/tmp/a.png'
			])
		).toThrow(/panel/i);
		expect(() => parseMeadowEntryPaintedV2CompleteSourceArguments(['--panel=north-west'])).toThrow(
			/input/i
		);
		expect(() =>
			parseMeadowEntryPaintedV2CompleteSourceArguments([
				'--panel=north-west',
				'--panel=north-east',
				'--input=/tmp/a.png'
			])
		).toThrow(/duplicate/i);
	});

	it('cover-scales, center-crops, canonicalizes, and writes only complete outputs', async () => {
		const repositoryRoot = mkdtempSync(join(tmpdir(), 'gliese-complete-normalize-'));
		const inputPath = join(repositoryRoot, 'native.png');
		const raw = Buffer.alloc(3000 * 2200 * 4);
		for (let offset = 0; offset < raw.length; offset += 4) {
			raw[offset] = 80;
			raw[offset + 1] = 120;
			raw[offset + 2] = 160;
			raw[offset + 3] = 255;
		}
		await sharp(raw, { raw: { width: 3000, height: 2200, channels: 4 } })
			.png()
			.toFile(inputPath);

		const result = await normalizeMeadowEntryPaintedV2CompleteSource({
			panelId: 'north-west',
			inputPath,
			repositoryRoot
		});
		const normalized = readFileSync(result.normalizedPath);
		const provenance = JSON.parse(readFileSync(result.provenancePath, 'utf8')) as Record<
			string,
			unknown
		>;
		validateCanonicalPngChunks(normalized);
		const decoded = await decodeMeadowEntryRgba(normalized);
		expect(decoded.width).toBe(2432);
		expect(decoded.height).toBe(1792);
		expect([...decoded.data.subarray(0, 4)]).toEqual([80, 120, 160, 255]);
		expect(provenance).toMatchObject({
			packageId: 'meadow-entry-painted-v2-complete',
			panelId: 'north-west',
			controlFingerprint: expect.any(String),
			normalized: {
				path: 'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-west.png',
				dimensions: { width: 2432, height: 1792 },
				sha256: result.normalizedSha256
			},
			transform: {
				scale: 1792 / 2200,
				output: { width: 2432, height: 1792 }
			}
		});
		expect(result.rawPath).toContain(
			'/artifacts/meadow-entry/painted-v2/complete/source-panels/raw/'
		);
		expect(result.normalizedPath).toContain(
			'/artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/'
		);
		expect(result.provenancePath).toContain(
			'/artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/'
		);
	});

	it('rejects transparency and any cover scale above 2 before writing outputs', async () => {
		const repositoryRoot = mkdtempSync(join(tmpdir(), 'gliese-complete-normalize-reject-'));
		const transparentPath = join(repositoryRoot, 'transparent.png');
		await sharp({ create: { width: 2432, height: 1792, channels: 4, background: '#11223300' } })
			.png()
			.toFile(transparentPath);
		await expect(
			normalizeMeadowEntryPaintedV2CompleteSource({
				panelId: 'north-west',
				inputPath: transparentPath,
				repositoryRoot
			})
		).rejects.toThrow(/opaque|transparent/i);

		const tinyPath = join(repositoryRoot, 'tiny.png');
		await sharp({ create: { width: 100, height: 100, channels: 3, background: '#112233' } })
			.png()
			.toFile(tinyPath);
		await expect(
			normalizeMeadowEntryPaintedV2CompleteSource({
				panelId: 'north-west',
				inputPath: tinyPath,
				repositoryRoot
			})
		).rejects.toThrow(/2|scale/i);
	});
});
