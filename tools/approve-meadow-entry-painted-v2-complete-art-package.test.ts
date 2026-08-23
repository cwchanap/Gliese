import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
	assertCompleteArtPackageApprovalSnapshot,
	type CompleteArtPackageApprovalSnapshot
} from './approve-meadow-entry-painted-v2-complete-art-package';

function hash(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function validSnapshot(): CompleteArtPackageApprovalSnapshot {
	const bytes = Buffer.from('complete-artifact');
	const artifact = {
		path: 'public/game/assets/regions/meadow-entry-painted-v2/complete.png',
		sha256: hash(bytes.toString()),
		bytes: bytes.byteLength,
		width: 3200,
		height: 3200
	};
	return {
		packageId: 'meadow-entry-painted-v2-complete',
		coverage: 'full-map',
		combinedControlFingerprint: '59ded996de5f7a468a7ef2d57219c851bf3d77488cfe8f3c9dedcbb3ea5c33b9',
		storageMode: 'git-lfs',
		storageConfigurationSha256: 'b'.repeat(64),
		master: {
			...artifact,
			path: 'artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png',
			width: 6400,
			height: 6400
		},
		masterProvenanceSha256: 'c'.repeat(64),
		exportProvenanceSha256: 'd'.repeat(64),
		cropManifestSha256: 'e'.repeat(64),
		textureProbe: {
			path: 'artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe/browser-3200.json',
			sha256: 'f'.repeat(64)
		},
		reviewProofInventory: {
			path: 'docs/superpowers/reports/img/hpa-586-painted-v2-complete/complete-review-manifest.json',
			sha256: '1'.repeat(64)
		},
		validationReport: {
			path: 'docs/superpowers/reports/2026-08-22-meadow-entry-painted-v2-complete-validation.md',
			sha256: '2'.repeat(64)
		},
		exports: [
			{
				...artifact,
				path: 'public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-northwest-base.png',
				cropId: 'painted-v2-complete-northwest',
				plane: 'base',
				textureKey: 'meadow-entry-painted-v2-complete-northwest-base',
				drawOrder: 0
			},
			{
				...artifact,
				path: 'public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-northeast-base.png',
				cropId: 'painted-v2-complete-northeast',
				plane: 'base',
				textureKey: 'meadow-entry-painted-v2-complete-northeast-base',
				drawOrder: 10
			},
			{
				...artifact,
				path: 'public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-southwest-base.png',
				cropId: 'painted-v2-complete-southwest',
				plane: 'base',
				textureKey: 'meadow-entry-painted-v2-complete-southwest-base',
				drawOrder: 20
			},
			{
				...artifact,
				path: 'public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-southeast-base.png',
				cropId: 'painted-v2-complete-southeast',
				plane: 'base',
				textureKey: 'meadow-entry-painted-v2-complete-southeast-base',
				drawOrder: 30
			}
		]
	};
}

describe('complete Meadow art package approval', () => {
	it('accepts the complete four-export binding with no foreground or visual-owner rows', () => {
		expect(() => assertCompleteArtPackageApprovalSnapshot(validSnapshot())).not.toThrow();
	});

	it.each([
		[
			'control fingerprint',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.combinedControlFingerprint = 'x')
		],
		[
			'master provenance',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.masterProvenanceSha256 = 'x')
		],
		[
			'export provenance',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.exportProvenanceSha256 = 'x')
		],
		[
			'texture probe',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.textureProbe.sha256 = 'x')
		],
		[
			'review proof inventory',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.reviewProofInventory.sha256 = 'x')
		],
		[
			'validation report',
			(snapshot: CompleteArtPackageApprovalSnapshot) => (snapshot.validationReport.sha256 = 'x')
		]
	])('fails closed when %s drifts', (_label, mutate) => {
		const snapshot = validSnapshot();
		mutate(snapshot);
		expect(() => assertCompleteArtPackageApprovalSnapshot(snapshot)).toThrow();
	});

	it('fails closed when an export is missing or becomes a foreground plane', () => {
		const missing = validSnapshot();
		missing.exports.pop();
		expect(() => assertCompleteArtPackageApprovalSnapshot(missing)).toThrow(/four/);

		const foreground = validSnapshot();
		foreground.exports[0]!.plane = 'foreground';
		expect(() => assertCompleteArtPackageApprovalSnapshot(foreground)).toThrow(/foreground|base/);
	});
});
