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

interface ApprovalArguments {
	reviewedBy: string;
	reviewedAt: string;
}

interface ApprovalValues {
	combinedControlFingerprint: string;
	cropManifestSha256: string;
	bakeOwnershipSha256: string;
	storageMode: 'git-lfs';
	storageConfigurationSha256: string;
	evidencePath: string;
}

interface ApprovalToolApi {
	validateMeadowEntryApprovalArtifacts: (snapshot: ApprovalArtifactSnapshot) => void;
	publishMeadowEntryControlsApproval: (
		contents: string,
		approvalPath: string,
		fileSystem: ApprovalPublicationFileSystem,
		temporaryToken: string
	) => void;
	parseMeadowEntryControlsApprovalArguments: (args: readonly string[]) => ApprovalArguments;
	renderMeadowEntryControlsApprovalModule: (
		review: ApprovalArguments,
		values: ApprovalValues
	) => string;
}

async function approvalApi(): Promise<ApprovalToolApi> {
	return import('../../../../tools/approve-meadow-entry-controls') as Promise<ApprovalToolApi>;
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

	it('rejects storage configuration with carriage returns or a missing final newline', async () => {
		const api = await approvalApi();
		const validate = api.validateMeadowEntryApprovalArtifacts;

		expect(validate).toBeTypeOf('function');
		if (!validate) return;
		expect(() =>
			validate(
				artifactSnapshot({
					storageConfiguration: Buffer.from(ATTRIBUTES.replace(/\n/g, '\r\n'))
				})
			)
		).toThrow(/LF bytes with a final newline/i);
		expect(() =>
			validate(
				artifactSnapshot({
					storageConfiguration: Buffer.from(ATTRIBUTES.trimEnd())
				})
			)
		).toThrow(/LF bytes with a final newline/i);
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

	it('rejects an invalid temporary publication token before touching the file system', async () => {
		const api = await approvalApi();
		const files = new Map([[approvalPath, 'prior approval bytes']]);

		expect(api.publishMeadowEntryControlsApproval).toBeTypeOf('function');
		if (!api.publishMeadowEntryControlsApproval) return;
		expect(() =>
			api.publishMeadowEntryControlsApproval!(
				'new approval',
				approvalPath,
				memoryFileSystem(files),
				'invalid token!'
			)
		).toThrow(/Invalid meadow-entry approval temporary token/);
		expect(files.get(approvalPath)).toBe('prior approval bytes');
		expect([...files.keys()]).toEqual([approvalPath]);
	});

	it('surfaces an aggregate error when staging cleanup also fails after a publish failure', async () => {
		const api = await approvalApi();

		expect(api.publishMeadowEntryControlsApproval).toBeTypeOf('function');
		if (!api.publishMeadowEntryControlsApproval) return;
		const failingFileSystem: ApprovalPublicationFileSystem = {
			writeFileExclusive() {
				throw new Error('injected write failure');
			},
			rename() {
				throw new Error('unexpected rename call');
			},
			remove() {
				throw new Error('injected cleanup failure');
			}
		};

		let caught: unknown;
		try {
			api.publishMeadowEntryControlsApproval(
				'new approval',
				approvalPath,
				failingFileSystem,
				'test-token'
			);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(AggregateError);
		expect((caught as AggregateError).message).toMatch(/Failed to publish meadow-entry approval/);
		expect((caught as AggregateError).errors).toHaveLength(2);
	});
});

describe('meadow-entry approval argument parsing', () => {
	it('parses valid --reviewed-by and --reviewed-at arguments', async () => {
		const api = await approvalApi();
		expect(api.parseMeadowEntryControlsApprovalArguments).toBeTypeOf('function');
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		const result = api.parseMeadowEntryControlsApprovalArguments([
			'--reviewed-by',
			'alice',
			'--reviewed-at',
			'2026-07-30T12:00:00Z'
		]);
		expect(result).toEqual({ reviewedBy: 'alice', reviewedAt: '2026-07-30T12:00:00Z' });
	});

	it('rejects an unknown argument flag', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments(['--unknown-flag', 'value'])
		).toThrow(/Unknown meadow-entry approval argument/);
	});

	it('rejects a duplicate argument', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'alice',
				'--reviewed-by',
				'bob'
			])
		).toThrow(/Duplicate meadow-entry approval argument/);
	});

	it('rejects a missing value for an argument', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() => api.parseMeadowEntryControlsApprovalArguments(['--reviewed-by'])).toThrow(
			/Missing value for meadow-entry approval argument/
		);
	});

	it('rejects a value that looks like a flag', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments(['--reviewed-by', '--reviewed-at'])
		).toThrow(/Missing value for meadow-entry approval argument/);
	});

	it('rejects a missing --reviewed-by argument', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments(['--reviewed-at', '2026-07-30T12:00:00Z'])
		).toThrow(/Missing required --reviewed-by/);
	});

	it('rejects an invalid --reviewed-by value', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				' leading space',
				'--reviewed-at',
				'2026-07-30T12:00:00Z'
			])
		).toThrow(/printable identity characters/);
	});

	it('rejects a missing --reviewed-at argument', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() => api.parseMeadowEntryControlsApprovalArguments(['--reviewed-by', 'alice'])).toThrow(
			/Missing required --reviewed-at/
		);
	});

	it('rejects a --reviewed-at value that does not match the UTC seconds format', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'alice',
				'--reviewed-at',
				'2026-07-30 12:00:00'
			])
		).toThrow(/UTC seconds in YYYY-MM-DDTHH:mm:ssZ form/);
	});

	it('rejects a --reviewed-at value that is not a valid UTC instant', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		expect(() =>
			api.parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'alice',
				'--reviewed-at',
				'2026-13-45T99:99:99Z'
			])
		).toThrow(/valid UTC instant/);
	});

	it('skips a leading -- separator when parsing arguments', async () => {
		const api = await approvalApi();
		if (!api.parseMeadowEntryControlsApprovalArguments) return;
		const result = api.parseMeadowEntryControlsApprovalArguments([
			'--',
			'--reviewed-by',
			'alice',
			'--reviewed-at',
			'2026-07-30T12:00:00Z'
		]);
		expect(result).toEqual({ reviewedBy: 'alice', reviewedAt: '2026-07-30T12:00:00Z' });
	});
});

describe('meadow-entry approval module rendering', () => {
	const validReview: ApprovalArguments = {
		reviewedBy: 'alice',
		reviewedAt: '2026-07-30T12:00:00Z'
	};
	const validValues: ApprovalValues = {
		combinedControlFingerprint: 'a'.repeat(64),
		cropManifestSha256: 'b'.repeat(64),
		bakeOwnershipSha256: 'c'.repeat(64),
		storageMode: 'git-lfs',
		storageConfigurationSha256: 'd'.repeat(64),
		evidencePath: 'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md'
	};

	it('renders a valid approval module with reviewed metadata and SHA-256 values', async () => {
		const api = await approvalApi();
		expect(api.renderMeadowEntryControlsApprovalModule).toBeTypeOf('function');
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		const output = api.renderMeadowEntryControlsApprovalModule(validReview, validValues);
		expect(output).toContain("reviewedBy: 'alice'");
		expect(output).toContain("reviewedAt: '2026-07-30T12:00:00Z'");
		expect(output).toContain(validValues.combinedControlFingerprint);
		expect(output).toContain(validValues.cropManifestSha256);
		expect(output).toContain(validValues.bakeOwnershipSha256);
		expect(output).toContain(validValues.storageConfigurationSha256);
	});

	it('rejects an invalid reviewedBy value', async () => {
		const api = await approvalApi();
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		expect(() =>
			api.renderMeadowEntryControlsApprovalModule(
				{ ...validReview, reviewedBy: ' leading space' },
				validValues
			)
		).toThrow(/surrounding whitespace is not allowed/);
	});

	it('rejects an invalid reviewedAt value', async () => {
		const api = await approvalApi();
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		expect(() =>
			api.renderMeadowEntryControlsApprovalModule(
				{ ...validReview, reviewedAt: 'not-a-date' },
				validValues
			)
		).toThrow(/UTC seconds/);
	});

	it('rejects an invalid SHA-256 value in approval values', async () => {
		const api = await approvalApi();
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		expect(() =>
			api.renderMeadowEntryControlsApprovalModule(validReview, {
				...validValues,
				combinedControlFingerprint: 'not-a-hash'
			})
		).toThrow(/Invalid approval SHA-256 value/);
	});

	it('rejects an invalid storage mode', async () => {
		const api = await approvalApi();
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		expect(() =>
			api.renderMeadowEntryControlsApprovalModule(validReview, {
				...validValues,
				storageMode: 'local' as 'git-lfs'
			})
		).toThrow(/Invalid fixed meadow-entry approval contract value/);
	});

	it('rejects an invalid evidence path', async () => {
		const api = await approvalApi();
		if (!api.renderMeadowEntryControlsApprovalModule) return;
		expect(() =>
			api.renderMeadowEntryControlsApprovalModule(validReview, {
				...validValues,
				evidencePath: 'wrong/path.md'
			})
		).toThrow(/Invalid fixed meadow-entry approval contract value/);
	});
});
