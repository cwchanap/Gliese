import { readFile, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng
} from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH,
	parseFinalizeMeadowEntryPaintedV2CompleteArguments,
	runFinalizeMeadowEntryPaintedV2Complete
} from './finalize-meadow-entry-painted-v2-complete';

async function opaqueMaster(): Promise<Buffer> {
	const png = await sharp({
		create: {
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
			channels: 4,
			background: '#345668ff'
		}
	})
		.raw()
		.toBuffer();
	return encodeCanonicalMeadowEntryPng(
		png,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	);
}

async function validAssemblyResult(): Promise<{
	masterPng: Buffer;
	provenanceJson: Buffer;
}> {
	const masterPng = await opaqueMaster();
	const masterSha256 = (await import('node:crypto'))
		.createHash('sha256')
		.update(masterPng)
		.digest('hex');
	const panels = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map((panel) => ({
		id: panel.id,
		bounds: panel.bounds,
		assemblyPriority: panel.assemblyPriority,
		provenancePath: panel.provenancePath,
		provenanceSha256: 'd'.repeat(64),
		rejectionHistory: [],
		raw: {
			path: panel.rawPath,
			sha256: 'b'.repeat(64),
			bytes: 1,
			dimensions: { width: 1, height: 1 }
		},
		generation: testGeneration(panel.id),
		normalized: {
			path: panel.normalizedPath,
			sha256: 'a'.repeat(64),
			bytes: 1,
			dimensions: panel.expectedDimensions
		}
	}));
	return {
		masterPng,
		provenanceJson: Buffer.from(
			JSON.stringify(
				{
					packageId: 'meadow-entry-painted-v2-complete',
					controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
					dimensions: {
						width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
						height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
					},
					assembly: {
						order: 'row-major',
						horizontalOverlapPx: 448,
						verticalOverlapPx: 256,
						handoffMaxHalfWidthPx: 96,
						canonicalPngChunks: ['IHDR', 'IDAT', 'IEND']
					},
					master: {
						sha256: masterSha256,
						bytes: masterPng.byteLength
					},
					panels
				},
				null,
				2
			) + '\n'
		)
	};
}

function testGeneration(panelId: string): Record<string, unknown> {
	const prompt = `test prompt ${panelId}`;
	return {
		attempt: 1,
		model: 'test-model',
		modelVersion: '1',
		provider: 'test-provider',
		tool: 'test-tool',
		prompt,
		promptSha256: createHash('sha256').update(prompt).digest('hex'),
		referenceIds: ['meadow-entry-painted-v2-complete-art-direction-reference']
	};
}

describe('complete Meadow Entry finalizer', () => {
	it('parses only the optional check flag', () => {
		expect(parseFinalizeMeadowEntryPaintedV2CompleteArguments([])).toEqual({ check: false });
		expect(parseFinalizeMeadowEntryPaintedV2CompleteArguments(['--check'])).toEqual({
			check: true
		});
		expect(() =>
			parseFinalizeMeadowEntryPaintedV2CompleteArguments(['--check', '--check'])
		).toThrow(/duplicate/i);
		expect(() => parseFinalizeMeadowEntryPaintedV2CompleteArguments(['--pilot'])).toThrow(
			/unknown/i
		);
	});

	it('writes and then checks one canonical opaque complete master without pilot dependencies', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-finalizer-'));
		const assemblyResult = await validAssemblyResult();
		const written = await runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
			assemblyResult
		});
		const checked = await runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
			assemblyResult,
			check: true
		});
		expect(written.masterSha256).toBe(checked.masterSha256);
		expect(written.masterPng).toEqual(await readFile(written.masterPath));
		const decoded = await decodeMeadowEntryRgba(written.masterPng);
		expect(decoded.width).toBe(6400);
		expect(decoded.height).toBe(6400);
		expect(written.provenanceJson.toString('utf8')).toContain('rejectionHistory');
	});

	it('carries an approved master sidecar into provenance and keeps it checkable', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-finalizer-approval-'));
		const assemblyResult = await validAssemblyResult();
		const initial = await runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
			assemblyResult
		});
		await writeFile(
			join(repositoryRoot, COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH),
			`${JSON.stringify({
				packageId: 'meadow-entry-painted-v2-complete',
				decision: 'approved',
				reviewer: 'chanwaichan',
				approvedAtUtc: '2026-08-23T06:00:50Z',
				masterSha256: initial.masterSha256,
				evidenceManifestSha256: 'e'.repeat(64)
			})}\n`
		);
		const approved = await runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
			assemblyResult
		});
		const provenance = JSON.parse(approved.provenanceJson.toString('utf8')) as Record<
			string,
			unknown
		>;
		expect(provenance.approval).toMatchObject({
			packageId: 'meadow-entry-painted-v2-complete',
			decision: 'approved',
			reviewer: 'chanwaichan',
			masterSha256: initial.masterSha256
		});
		await expect(
			runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
				assemblyResult,
				check: true
			})
		).resolves.toMatchObject({ masterSha256: initial.masterSha256 });
	});

	it('fails closed when the assembled master hash or control fingerprint is stale', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-finalizer-reject-'));
		const assemblyResult = await validAssemblyResult();
		const stale = JSON.parse(assemblyResult.provenanceJson.toString('utf8')) as Record<
			string,
			unknown
		>;
		(stale.master as Record<string, unknown>).sha256 = 'b'.repeat(64);
		await expect(
			runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
				assemblyResult: {
					...assemblyResult,
					provenanceJson: Buffer.from(`${JSON.stringify(stale)}\n`)
				}
			})
		).rejects.toThrow(/hash|stale/i);

		const wrongControl = JSON.parse(assemblyResult.provenanceJson.toString('utf8')) as Record<
			string,
			unknown
		>;
		wrongControl.controlFingerprint = 'c'.repeat(64);
		await expect(
			runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
				assemblyResult: {
					...assemblyResult,
					provenanceJson: Buffer.from(`${JSON.stringify(wrongControl)}\n`)
				}
			})
		).rejects.toThrow(/fingerprint|control/i);
	});

	it('fails closed when assembled panel provenance omits raw and generation integrity records', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-finalizer-integrity-'));
		const assemblyResult = await validAssemblyResult();
		const provenance = JSON.parse(assemblyResult.provenanceJson.toString('utf8')) as {
			panels: Array<Record<string, unknown>>;
		};
		delete provenance.panels[0]!.raw;
		await expect(
			runFinalizeMeadowEntryPaintedV2Complete(repositoryRoot, {
				assemblyResult: {
					...assemblyResult,
					provenanceJson: Buffer.from(`${JSON.stringify(provenance)}\n`)
				}
			})
		).rejects.toThrow(/raw|generation|provenance/i);
	});

	it('keeps the canonical encoder contract explicit in the finalizer test fixture', async () => {
		const raw = Buffer.alloc(4 * 4 * 4, 255);
		const png = await encodeCanonicalMeadowEntryPng(raw, 4, 4);
		expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
	});
});
