import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MEADOW_ENTRY_ART_STORAGE } from '$lib/game/content/backgrounds/meadow-entry-storage';

interface ApprovalArtifactSnapshot {
	currentCombinedFingerprint: string;
	checkedInCombinedFingerprint: string;
	renderedCropManifest: string;
	checkedInCropManifest: Uint8Array;
	renderedBakeOwnership: string;
	checkedInBakeOwnership: Uint8Array;
	storageConfiguration: Uint8Array;
}

interface ApprovalPublicationFileSystem {
	writeFileExclusive(path: string, contents: string): void;
	rename(source: string, destination: string): void;
	remove(path: string): void;
}

interface ApprovalToolApi {
	validateMeadowEntryApprovalArtifacts?: (snapshot: ApprovalArtifactSnapshot) => void;
	publishMeadowEntryControlsApproval?: (
		contents: string,
		approvalPath: string,
		fileSystem: ApprovalPublicationFileSystem,
		temporaryToken: string
	) => void;
}

async function approvalApi(): Promise<ApprovalToolApi> {
	return import('../../../../tools/approve-meadow-entry-controls');
}

const FINGERPRINT = '1'.repeat(64);
const ATTRIBUTES = `${MEADOW_ENTRY_ART_STORAGE.assetPattern} filter=lfs diff=lfs merge=lfs -text
${MEADOW_ENTRY_ART_STORAGE.proofPattern} filter=lfs diff=lfs merge=lfs -text
`;

function artifactSnapshot(
	overrides: Partial<ApprovalArtifactSnapshot> = {}
): ApprovalArtifactSnapshot {
	return {
		currentCombinedFingerprint: FINGERPRINT,
		checkedInCombinedFingerprint: FINGERPRINT,
		renderedCropManifest: '{"crops":[]}\n',
		checkedInCropManifest: Buffer.from('{"crops":[]}\n'),
		renderedBakeOwnership: '{"entries":[]}\n',
		checkedInBakeOwnership: Buffer.from('{"entries":[]}\n'),
		storageConfiguration: Buffer.from(ATTRIBUTES),
		...overrides
	};
}

function memoryFileSystem(
	files: Map<string, string>,
	failure?: 'write' | 'rename'
): ApprovalPublicationFileSystem {
	return {
		writeFileExclusive(path, contents) {
			files.set(path, 'partial temporary bytes');
			if (failure === 'write') throw new Error('injected write failure');
			files.set(path, contents);
		},
		rename(source, destination) {
			if (failure === 'rename') throw new Error('injected rename failure');
			const contents = files.get(source);
			if (contents === undefined) throw new Error('missing staged file');
			files.set(destination, contents);
			files.delete(source);
		},
		remove(path) {
			files.delete(path);
		}
	};
}

describe('meadow-entry approval artifact validation', () => {
	it('rejects current-source fingerprint drift', async () => {
		const api = await approvalApi();
		const validate = api.validateMeadowEntryApprovalArtifacts;

		expect(validate).toBeTypeOf('function');
		if (!validate) return;
		expect(() =>
			validate(artifactSnapshot({ currentCombinedFingerprint: '2'.repeat(64) }))
		).toThrow(/combined.*fingerprint/i);
	});

	it.each([
		['crop', { checkedInCropManifest: Buffer.from('{"crops":["drift"]}\n') }],
		['bake ownership', { checkedInBakeOwnership: Buffer.from('{"entries":["drift"]}\n') }]
	] as const)('rejects checked-in %s artifact drift', async (label, overrides) => {
		const api = await approvalApi();
		const validate = api.validateMeadowEntryApprovalArtifacts;

		expect(validate).toBeTypeOf('function');
		if (!validate) return;
		expect(() => validate(artifactSnapshot(overrides))).toThrow(new RegExp(label, 'i'));
	});

	it('rejects missing proof storage configuration', async () => {
		const api = await approvalApi();
		const validate = api.validateMeadowEntryApprovalArtifacts;

		expect(validate).toBeTypeOf('function');
		if (!validate) return;
		expect(() =>
			validate(
				artifactSnapshot({
					storageConfiguration: Buffer.from(
						`${MEADOW_ENTRY_ART_STORAGE.assetPattern} filter=lfs diff=lfs merge=lfs -text\n`
					)
				})
			)
		).toThrow(/proof.*Git LFS configuration/i);
	});
});

describe('meadow-entry approval atomic publication', () => {
	const approvalPath = '/repo/src/lib/game/content/approvals/meadow-entry-controls.ts';
	const temporaryPath = join(dirname(approvalPath), '.meadow-entry-controls.ts.test-token.tmp');

	it.each(['write', 'rename'] as const)(
		'preserves prior approval and removes staging after an injected %s failure',
		async (failure) => {
			const api = await approvalApi();
			const files = new Map([[approvalPath, 'prior approval bytes']]);

			expect(api.publishMeadowEntryControlsApproval).toBeTypeOf('function');
			if (!api.publishMeadowEntryControlsApproval) return;
			expect(() =>
				api.publishMeadowEntryControlsApproval!(
					'new complete approval',
					approvalPath,
					memoryFileSystem(files, failure),
					'test-token'
				)
			).toThrow(new RegExp(`injected ${failure} failure`));
			expect(files.get(approvalPath)).toBe('prior approval bytes');
			expect(files.has(temporaryPath)).toBe(false);
		}
	);

	it('publishes complete deterministic bytes through one adjacent rename', async () => {
		const api = await approvalApi();
		const files = new Map([[approvalPath, 'prior approval bytes']]);

		expect(api.publishMeadowEntryControlsApproval).toBeTypeOf('function');
		if (!api.publishMeadowEntryControlsApproval) return;
		api.publishMeadowEntryControlsApproval(
			'new complete approval',
			approvalPath,
			memoryFileSystem(files),
			'test-token'
		);

		expect(files.get(approvalPath)).toBe('new complete approval');
		expect(files.has(temporaryPath)).toBe(false);
		expect([...files.keys()]).toEqual([approvalPath]);
	});
});
