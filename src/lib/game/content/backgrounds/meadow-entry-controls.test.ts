import { sundropVillageBackgroundsApproval } from '$lib/game/content/approvals/sundrop-village-backgrounds';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import { describe, expect, it } from 'vitest';

import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryAuthoringContractFingerprint,
	computeMeadowEntryCombinedControlFingerprint,
	computeMeadowEntryGameplaySourceFingerprint,
	MEADOW_ENTRY_CONTROL_FILENAMES,
	renderMeadowEntryControls,
	type MeadowEntryControlInputs
} from './meadow-entry-controls';

const EXPECTED_CONTROL_FILENAMES = [
	'meadow-entry-control-manifest.json',
	'meadow-entry-composite-control.svg',
	'meadow-entry-terrain-path-mask.svg',
	'meadow-entry-region-mask.svg',
	'meadow-entry-collision-mask.svg',
	'meadow-entry-building-footprint-mask.svg',
	'meadow-entry-entrance-transition-mask.svg',
	'meadow-entry-encounter-combat-mask.svg',
	'meadow-entry-reward-discovery-mask.svg',
	'meadow-entry-semantic-anchor-mask.svg',
	'meadow-entry-protected-live-mask.svg',
	'meadow-entry-forbidden-tall-mask.svg',
	'meadow-entry-foreground-eligible-mask.svg',
	'meadow-entry-handoff-mask.svg',
	'meadow-entry-runtime-base-coverage-mask.svg',
	'meadow-entry-runtime-fallback-coverage-mask.svg',
	'meadow-entry-bake-ownership.json',
	'meadow-entry-crop-manifest.json'
] as const;

const SHA256 = /^[0-9a-f]{64}$/;

interface ParsedSvgRect {
	id: string;
	left: number;
	top: number;
	right: number;
	bottom: number;
}

function parseSvgRects(svg: string): readonly ParsedSvgRect[] {
	return [
		...svg.matchAll(
			/<rect data-id="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g
		)
	].map(([, id, x, y, width, height]) => {
		const left = Number(x);
		const top = Number(y);
		return {
			id: id!,
			left,
			top,
			right: left + Number(width),
			bottom: top + Number(height)
		};
	});
}

function containsPoint(rect: ParsedSvgRect, x: number, y: number): boolean {
	return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

function maskPixel(alpha: Buffer, x: number, y: number): number {
	return alpha[y * 6_400 + x]!;
}

describe('meadow-entry deterministic authoring controls', () => {
	it('renders the reviewed fixed inventory byte-identically on repeated builds', () => {
		const input = buildMeadowEntryControlInputs();
		const first = renderMeadowEntryControls(input);
		const second = renderMeadowEntryControls(input);

		expect(MEADOW_ENTRY_CONTROL_FILENAMES).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(Object.keys(first)).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(second).toEqual(first);
		for (const filename of EXPECTED_CONTROL_FILENAMES) {
			expect(first[filename]?.endsWith('\n'), filename).toBe(true);
		}
	});

	it('separates gameplay, authoring, and combined lowercase SHA-256 domains', () => {
		const input = buildMeadowEntryControlInputs();
		const gameplay = computeMeadowEntryGameplaySourceFingerprint(input);
		const authoring = computeMeadowEntryAuthoringContractFingerprint(input);
		const combined = computeMeadowEntryCombinedControlFingerprint(input);

		expect(gameplay).toMatch(SHA256);
		expect(authoring).toMatch(SHA256);
		expect(combined).toMatch(SHA256);
		expect(new Set([gameplay, authoring, combined]).size).toBe(3);
		expect(input.predecessor.hpa398ControlFingerprint).toBe(
			sundropVillageBackgroundsApproval.approvedControlFingerprint
		);
		expect(input.predecessor.hpa398BaseSha256).toBe(
			sundropVillageBackgroundsApproval.base.approvedPngSha256
		);
		expect(input.predecessor.hpa398ForegroundSha256).toBe(
			sundropVillageBackgroundsApproval.foreground.approvedPngSha256
		);
		expect(Object.keys(input.predecessor.hpa307ArtifactHashes)).toHaveLength(9);
		for (const hash of Object.values(input.predecessor.hpa307ArtifactHashes)) {
			expect(hash).toMatch(SHA256);
		}
	});

	it('builds 6400px masks and removes every protected pixel from foreground eligibility', () => {
		const input = buildMeadowEntryControlInputs();
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(input);
		const eligibleMask = buildMeadowEntryForegroundEligibleRasterMask(input);

		expect(protectedMask.width).toBe(6_400);
		expect(protectedMask.height).toBe(6_400);
		expect(protectedMask.alpha).toHaveLength(6_400 * 6_400);
		expect(eligibleMask.width).toBe(6_400);
		expect(eligibleMask.height).toBe(6_400);
		expect(eligibleMask.alpha).toHaveLength(6_400 * 6_400);
		expect(protectedMask.alpha.includes(255)).toBe(true);
		expect(eligibleMask.alpha.includes(255)).toBe(true);

		let overlappingPixel = -1;
		for (let index = 0; index < protectedMask.alpha.length; index += 1) {
			if (protectedMask.alpha[index] !== 0 && eligibleMask.alpha[index] !== 0) {
				overlappingPixel = index;
				break;
			}
		}
		expect(overlappingPixel).toBe(-1);
	});

	it('excludes spawn, discovery, encounter, and combat clearances from foreground eligibility and marks them forbidden-tall', () => {
		const input = buildMeadowEntryControlInputs();
		const eligible = buildMeadowEntryForegroundEligibleRasterMask(input).alpha;
		const rendered = renderMeadowEntryControls(input);
		const forbidden = parseSvgRects(rendered['meadow-entry-forbidden-tall-mask.svg']!);
		const foregroundControl = rendered['meadow-entry-foreground-eligible-mask.svg']!;
		const semanticPoints = [
			{ id: 'spawn:player', x: 624, y: 5_776 },
			...(meadowEntryMap.discoveries ?? []).map(({ id, x, y }) => ({
				id: `discovery:${id}`,
				x,
				y
			})),
			...(meadowEntryMap.encounters ?? []).map(({ id, x, y }) => ({
				id: `encounter:${id}`,
				x,
				y
			})),
			...(meadowEntryMap.combatBounds ?? []).map(({ id, x, y }) => ({
				id: `combat-bounds:${id}`,
				x,
				y
			}))
		];

		expect(semanticPoints.length).toBeGreaterThan(4);
		for (const point of semanticPoints) {
			expect(maskPixel(eligible, point.x, point.y), point.id).toBe(0);
			expect(
				forbidden.some((rect) => rect.id === point.id && containsPoint(rect, point.x, point.y)),
				point.id
			).toBe(true);
			expect(foregroundControl, point.id).toContain(`data-id="foreground-exclusion:${point.id}"`);
		}
		expect(rendered['meadow-entry-semantic-anchor-mask.svg']).toContain('data-id="spawn:player"');
	});

	it('preserves reviewed terrain material, owner, connector, disposition, and contributor metadata', () => {
		const terrain = renderMeadowEntryControls(buildMeadowEntryControlInputs())[
			'meadow-entry-terrain-path-mask.svg'
		]!;
		const connector = terrain
			.split('\n')
			.find((line) => line.includes('data-id="ground-patch:link-village-crossroads"'));

		expect(connector).toContain('data-tile="pathTile"');
		expect(connector).toContain('data-material-profile="village-crossroads-handoff"');
		expect(connector).toContain('data-primary-region="connector-village-crossroads"');
		expect(connector).toContain('data-connector-membership="connector-village-crossroads"');
		expect(connector).toContain('data-disposition="base-underlay"');
		expect(connector).toContain('data-contributing-sources="ground-patch:link-village-crossroads"');
	});

	it('labels explicit foreground ownership and the reviewed 33px front cutoff', () => {
		const foreground = renderMeadowEntryControls(buildMeadowEntryControlInputs())[
			'meadow-entry-foreground-eligible-mask.svg'
		]!;
		const reviewedBlocker = foreground
			.split('\n')
			.find((line) => line.includes('data-id="foreground:blocker:village-block-2-2"'));

		expect(reviewedBlocker).toBeDefined();
		if (!reviewedBlocker) return;
		expect(reviewedBlocker).toContain('data-disposition="base-and-foreground"');
		expect(reviewedBlocker).toContain('data-front-cutoff-px="33"');
		expect(reviewedBlocker).toContain('data-primary-region="sundrop-village"');
	});

	it('keeps an authoritative protected-live footprint protected and ineligible', () => {
		const input = buildMeadowEntryControlInputs();
		const protectedEntry = input.bakeOwnership.find(
			(entry) =>
				entry.disposition.mode === 'protected-live' &&
				input.sourceCatalog.find(
					(record) =>
						record.ref.sourceType === entry.ref.sourceType &&
						record.ref.sourceId === entry.ref.sourceId
				)?.bounds !== null
		);
		expect(protectedEntry).toBeDefined();
		if (!protectedEntry) return;
		const record = input.sourceCatalog.find(
			(candidate) =>
				candidate.ref.sourceType === protectedEntry.ref.sourceType &&
				candidate.ref.sourceId === protectedEntry.ref.sourceId
		)!;
		const x = Math.floor((record.bounds!.left + record.bounds!.right) / 2);
		const y = Math.floor((record.bounds!.top + record.bounds!.bottom) / 2);
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(input).alpha;
		const eligibleMask = buildMeadowEntryForegroundEligibleRasterMask(input).alpha;

		expect(maskPixel(protectedMask, x, y)).toBe(255);
		expect(maskPixel(eligibleMask, x, y)).toBe(0);
	});

	it('fingerprints gameplay, authoring renderer-mask-material, predecessor, and storage domains independently', () => {
		const input = buildMeadowEntryControlInputs();
		const original = {
			gameplay: computeMeadowEntryGameplaySourceFingerprint(input),
			authoring: computeMeadowEntryAuthoringContractFingerprint(input),
			combined: computeMeadowEntryCombinedControlFingerprint(input)
		};
		const rendererContract = (
			input as MeadowEntryControlInputs & {
				rendererMaskMaterialContract?: {
					version: number;
					implementationSha256?: string;
					pointExtentsPx: { pickup: { width: number; height: number } };
					materialProfiles: Readonly<Record<string, string>>;
				};
			}
		).rendererMaskMaterialContract;

		expect(rendererContract).toBeDefined();
		if (!rendererContract) return;
		expect(rendererContract.version).toBe(1);
		expect(rendererContract.implementationSha256).toMatch(SHA256);
		expect(rendererContract.materialProfiles['connector-village-crossroads']).toBe(
			'village-crossroads-handoff'
		);

		const gameplayMutation = {
			...input,
			sourceFileHashes: { ...input.sourceFileHashes, synthetic: 'a'.repeat(64) }
		};
		const rendererMutation = {
			...input,
			rendererMaskMaterialContract: {
				...rendererContract,
				pointExtentsPx: {
					...rendererContract.pointExtentsPx,
					pickup: {
						...rendererContract.pointExtentsPx.pickup,
						width: rendererContract.pointExtentsPx.pickup.width + 1
					}
				}
			}
		} as MeadowEntryControlInputs;
		const predecessorMutation = {
			...input,
			predecessor: { ...input.predecessor, hpa398BaseSha256: 'b'.repeat(64) }
		};
		const storageMutation = {
			...input,
			storage: { ...input.storage, canaryPath: 'artifacts/meadow-entry/hpa-399/other.png' }
		} as unknown as MeadowEntryControlInputs;

		expect(computeMeadowEntryGameplaySourceFingerprint(gameplayMutation)).not.toBe(
			original.gameplay
		);
		expect(computeMeadowEntryAuthoringContractFingerprint(gameplayMutation)).toBe(
			original.authoring
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(rendererMutation)).toBe(original.gameplay);
		expect(computeMeadowEntryAuthoringContractFingerprint(rendererMutation)).not.toBe(
			original.authoring
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(predecessorMutation)).toBe(
			original.gameplay
		);
		expect(computeMeadowEntryAuthoringContractFingerprint(predecessorMutation)).toBe(
			original.authoring
		);
		expect(computeMeadowEntryCombinedControlFingerprint(predecessorMutation)).not.toBe(
			original.combined
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(storageMutation)).toBe(original.gameplay);
		expect(computeMeadowEntryAuthoringContractFingerprint(storageMutation)).not.toBe(
			original.authoring
		);
	});
});
