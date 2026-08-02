import { createHash } from 'node:crypto';

import {
	readPublishedMeadowEntryExportSnapshot,
	type MeadowEntryExportPackageBytes
} from './export-meadow-entry-regions';
import {
	readApprovedMeadowEntryPackageSnapshot,
	type ApprovedPackageBytes
} from './finalize-meadow-entry-masters';

export interface CoherentMeadowEntryArtSourceSnapshot extends ApprovedPackageBytes {
	exports: MeadowEntryExportPackageBytes;
}

interface SnapshotReaders {
	readApprovedSnapshot: (outputRoot: string) => Promise<ApprovedPackageBytes>;
	readExportSnapshot: (outputRoot: string) => Promise<MeadowEntryExportPackageBytes>;
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function parseJson(bytes: Buffer, label: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(bytes.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Meadow Entry ${label} is not valid JSON`);
	}
	assert(
		value !== null && typeof value === 'object' && !Array.isArray(value),
		`${label} is not an object`
	);
	return value as Record<string, unknown>;
}

function snapshotsEqual(first: ApprovedPackageBytes, second: ApprovedPackageBytes): boolean {
	return (
		first.basePng.equals(second.basePng) &&
		first.foregroundPng.equals(second.foregroundPng) &&
		first.provenanceJson.equals(second.provenanceJson)
	);
}

function assertExportBindsApprovedMaster(
	approved: ApprovedPackageBytes,
	exports: MeadowEntryExportPackageBytes
): void {
	const provenance = parseJson(exports.provenanceJson, 'export provenance');
	const manifest = parseJson(exports.cropManifestJson, 'crop manifest');
	const exportMasters = provenance.masters as
		| { base?: { sha256?: unknown }; foreground?: { sha256?: unknown } }
		| undefined;
	const manifestMasters = manifest.masters as
		| { baseSha256?: unknown; foregroundSha256?: unknown; provenanceSha256?: unknown }
		| undefined;
	const baseSha256 = sha256(approved.basePng);
	const foregroundSha256 = sha256(approved.foregroundPng);
	const provenanceSha256 = sha256(approved.provenanceJson);
	assert(
		provenance.version === 1 &&
			manifest.version === 1 &&
			exportMasters?.base?.sha256 === baseSha256 &&
			exportMasters?.foreground?.sha256 === foregroundSha256 &&
			provenance.approvedMasterProvenanceSha256 === provenanceSha256 &&
			manifestMasters?.baseSha256 === baseSha256 &&
			manifestMasters.foregroundSha256 === foregroundSha256 &&
			manifestMasters.provenanceSha256 === provenanceSha256,
		'Meadow Entry export snapshot does not bind the approved master snapshot'
	);
}

export async function readCoherentMeadowEntryArtSourceSnapshot(
	outputRoot: string,
	options: { attempts?: number } & Partial<SnapshotReaders> = {}
): Promise<CoherentMeadowEntryArtSourceSnapshot> {
	const attempts = options.attempts ?? 3;
	assert(
		Number.isInteger(attempts) && attempts > 0,
		'Art source snapshot attempts must be positive'
	);
	const readApprovedSnapshot =
		options.readApprovedSnapshot ??
		(async (root: string) => await readApprovedMeadowEntryPackageSnapshot(root));
	const readExportSnapshot =
		options.readExportSnapshot ??
		(async (root: string) => await readPublishedMeadowEntryExportSnapshot(root));
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const approvedBefore = await readApprovedSnapshot(outputRoot);
			const exports = await readExportSnapshot(outputRoot);
			const approvedAfter = await readApprovedSnapshot(outputRoot);
			assert(
				snapshotsEqual(approvedBefore, approvedAfter),
				'Meadow Entry approved master publication changed while reading its export generation'
			);
			assertExportBindsApprovedMaster(approvedBefore, exports);
			return { ...approvedBefore, exports };
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('Meadow Entry coherent art source snapshot is unavailable');
}
