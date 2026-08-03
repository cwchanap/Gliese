import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import type { MeadowEntryExportPackageBytes } from '../../../../../tools/export-meadow-entry-regions';
import type { ApprovedPackageBytes } from '../../../../../tools/finalize-meadow-entry-masters';

async function snapshotApi() {
	return await import('../../../../../tools/read-meadow-entry-art-source-snapshot');
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function generation(name: string): {
	masters: ApprovedPackageBytes;
	exports: MeadowEntryExportPackageBytes;
} {
	const basePng = Buffer.from(`${name}-base`);
	const foregroundPng = Buffer.from(`${name}-foreground`);
	const provenanceJson = Buffer.from(`${name}-master-provenance`);
	const masterIds = {
		baseSha256: sha256(basePng),
		foregroundSha256: sha256(foregroundPng),
		provenanceSha256: sha256(provenanceJson)
	};
	return {
		masters: { basePng, foregroundPng, provenanceJson },
		exports: {
			files: { [`${name}-base.png`]: Buffer.from(`${name}-export`) },
			provenanceJson: Buffer.from(
				JSON.stringify({
					version: 1,
					masters: {
						base: { sha256: masterIds.baseSha256 },
						foreground: { sha256: masterIds.foregroundSha256 }
					},
					approvedMasterProvenanceSha256: masterIds.provenanceSha256
				})
			),
			cropManifestJson: Buffer.from(JSON.stringify({ version: 1, masters: masterIds }))
		}
	};
}

describe('coherent Meadow Entry art source snapshot', () => {
	it('retries across a master/export writer barrier and returns only one generation', async () => {
		const oldGeneration = generation('old');
		const nextGeneration = generation('next');
		const masterReads = [
			oldGeneration.masters,
			nextGeneration.masters,
			nextGeneration.masters,
			nextGeneration.masters
		];
		const exportReads = [nextGeneration.exports, nextGeneration.exports];
		const api = await snapshotApi();

		const snapshot = await api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
			attempts: 2,
			readApprovedSnapshot: async () => masterReads.shift()!,
			readExportSnapshot: async () => exportReads.shift()!
		});

		expect(snapshot.basePng).toEqual(nextGeneration.masters.basePng);
		expect(snapshot.exports.files).toEqual(nextGeneration.exports.files);
		expect(masterReads).toHaveLength(0);
	});

	it('fails closed when every export snapshot is bound to a different master generation', async () => {
		const oldGeneration = generation('old');
		const nextGeneration = generation('next');
		const api = await snapshotApi();

		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: 2,
				readApprovedSnapshot: async () => oldGeneration.masters,
				readExportSnapshot: async () => nextGeneration.exports
			})
		).rejects.toThrow(/Meadow Entry export provenance master base sha256=/);
	});

	it('rejects a non-positive attempts count', async () => {
		const api = await snapshotApi();
		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: 0,
				readApprovedSnapshot: async () => generation('x').masters,
				readExportSnapshot: async () => generation('x').exports
			})
		).rejects.toThrow(/attempts must be positive/i);
	});

	it('rejects a negative attempts count', async () => {
		const api = await snapshotApi();
		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: -1,
				readApprovedSnapshot: async () => generation('x').masters,
				readExportSnapshot: async () => generation('x').exports
			})
		).rejects.toThrow(/attempts must be positive/i);
	});

	it('rejects a non-integer attempts count', async () => {
		const api = await snapshotApi();
		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: 1.5,
				readApprovedSnapshot: async () => generation('x').masters,
				readExportSnapshot: async () => generation('x').exports
			})
		).rejects.toThrow(/attempts must be positive/i);
	});

	it('fails when the approved master publication changes between the before and after reads', async () => {
		const oldGeneration = generation('old');
		const nextGeneration = generation('next');
		const api = await snapshotApi();
		const reads = [oldGeneration.masters, nextGeneration.masters];

		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: 1,
				readApprovedSnapshot: async () => reads.shift()!,
				readExportSnapshot: async () => oldGeneration.exports
			})
		).rejects.toThrow(/approved master publication changed while reading/i);
	});

	it('rethrows a non-Error thrown value as a wrapped Error after exhausting attempts', async () => {
		const api = await snapshotApi();
		await expect(
			api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
				attempts: 1,
				readApprovedSnapshot: async () => {
					throw 'string error';
				},
				readExportSnapshot: async () => generation('x').exports
			})
		).rejects.toThrow(/coherent art source snapshot is unavailable/i);
	});

	it('returns a coherent snapshot on the first attempt when reads are consistent', async () => {
		const gen = generation('consistent');
		const api = await snapshotApi();
		const snapshot = await api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
			attempts: 3,
			readApprovedSnapshot: async () => gen.masters,
			readExportSnapshot: async () => gen.exports
		});
		expect(snapshot.basePng).toEqual(gen.masters.basePng);
		expect(snapshot.foregroundPng).toEqual(gen.masters.foregroundPng);
		expect(snapshot.provenanceJson).toEqual(gen.masters.provenanceJson);
		expect(snapshot.exports.provenanceJson).toEqual(gen.exports.provenanceJson);
	});

	it('retries when the first attempt throws and succeeds on the second', async () => {
		const gen = generation('retry');
		const api = await snapshotApi();
		let attempt = 0;
		const snapshot = await api.readCoherentMeadowEntryArtSourceSnapshot('/unused', {
			attempts: 3,
			readApprovedSnapshot: async () => {
				attempt++;
				if (attempt === 1) throw new Error('transient failure');
				return gen.masters;
			},
			readExportSnapshot: async () => gen.exports
		});
		expect(snapshot.basePng).toEqual(gen.masters.basePng);
	});
});
