import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

interface ApprovedSnapshot {
	basePng: Buffer;
	foregroundPng: Buffer;
	provenanceJson: Buffer;
}

interface ExportSnapshot {
	files: Record<string, Buffer>;
	provenanceJson: Buffer;
	cropManifestJson: Buffer;
}

interface SnapshotApi {
	readCoherentMeadowEntryArtSourceSnapshot(
		outputRoot: string,
		options?: {
			attempts?: number;
			readApprovedSnapshot?: (outputRoot: string) => Promise<ApprovedSnapshot>;
			readExportSnapshot?: (outputRoot: string) => Promise<ExportSnapshot>;
		}
	): Promise<ApprovedSnapshot & { exports: ExportSnapshot }>;
}

async function snapshotApi(): Promise<SnapshotApi> {
	return (await import('../../../../../tools/read-meadow-entry-art-source-snapshot')) as unknown as SnapshotApi;
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function generation(name: string): { masters: ApprovedSnapshot; exports: ExportSnapshot } {
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
		).rejects.toThrow(/export snapshot does not bind the approved master snapshot/i);
	});
});
