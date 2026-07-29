import { describe, expect, it } from 'vitest';

import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';

import {
	buildSundropVillageObstacleControlInputs,
	buildSundropVillageObstacleOcclusionProofCases,
	computeSundropVillageObstacleControlFingerprint,
	renderSundropVillageObstacleControlArtifacts,
	SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES
} from './sundrop-village-obstacle-controls';
import { SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX } from './sundrop-village-backgrounds';
import { SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP } from './sundrop-village-obstacle-ownership';

function intersects(
	left: { x: number; y: number; width: number; height: number },
	right: { x: number; y: number; width: number; height: number }
): boolean {
	return (
		left.x - left.width / 2 < right.x + right.width / 2 &&
		left.x + left.width / 2 > right.x - right.width / 2 &&
		left.y - left.height / 2 < right.y + right.height / 2 &&
		left.y + left.height / 2 > right.y - right.height / 2
	);
}

describe('Sundrop Village obstacle controls', () => {
	it('owns exactly the fixed six-artifact inventory', () => {
		expect(SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES).toEqual([
			'village-obstacle-ownership.json',
			'village-obstacle-base-mask.svg',
			'village-obstacle-foreground-mask.svg',
			'village-obstacle-protected-mask.svg',
			'village-obstacle-composite-control.svg',
			'village-obstacle-control-manifest.json'
		]);
	});

	it('renders resolved ownership and masks in the local 1792 by 1536 crop', () => {
		const inputs = buildSundropVillageObstacleControlInputs();
		const artifacts = renderSundropVillageObstacleControlArtifacts(inputs);
		const ownership = JSON.parse(artifacts.get('village-obstacle-ownership.json') ?? '{}');
		expect(ownership.entries).toHaveLength(21);
		expect(ownership.entries.every((entry: { blocker: unknown }) => entry.blocker)).toBe(true);
		expect(artifacts.get('village-obstacle-base-mask.svg')).toContain('viewBox="0 0 1792 1536"');
		expect(artifacts.get('village-obstacle-foreground-mask.svg')).toContain(
			'viewBox="0 0 1792 1536"'
		);
		const foregroundBlockerIds = [...new Set(inputs.foregroundRects.map((rect) => rect.id))].sort();
		expect(foregroundBlockerIds).toHaveLength(7);
		expect(foregroundBlockerIds).toEqual(
			SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) => entry.foregroundMargins)
				.map((entry) => entry.blockerId)
				.sort()
		);
		expect(inputs.baseRects.map((rect) => rect.id)).not.toEqual(
			expect.arrayContaining(['village-block-0-37', 'village-block-0-49', 'village-block-46-2'])
		);
		for (const rect of inputs.foregroundRects) {
			expect(rect.blockerBottom).toBeDefined();
			expect(rect.bottom).toBe(
				(rect.blockerBottom ?? 0) - SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
			);
		}
	});

	it('derives hedge and low-wall occlusion views from foreground-owned assembled blockers', () => {
		const inputs = buildSundropVillageObstacleControlInputs();
		const proofCases = buildSundropVillageObstacleOcclusionProofCases(inputs);
		const collisionRects = [
			...collectStrictCollisionRects(inputs.map),
			...collectLandmarkRects(inputs.map)
		];
		expect(proofCases.map((proofCase) => proofCase.motif)).toEqual(['hedge', 'low-wall']);
		for (const proofCase of proofCases) {
			const ownership = inputs.ownership.find((entry) => entry.blockerId === proofCase.blockerId);
			const blocker = inputs.map.blockers?.find(
				(candidate) => candidate.id === proofCase.blockerId
			);
			expect(ownership?.foregroundMargins).toBeDefined();
			expect(proofCase.ownerBackgroundIds).toEqual(ownership?.ownerBackgroundIds);
			expect(blocker).toEqual(expect.objectContaining(proofCase.blocker.world));
			expect(proofCase.foregroundControlRect.id).toBe(proofCase.blockerId);
			expect(proofCase.cutoff.worldY).toBe(inputs.crop.y + proofCase.foregroundControlRect.bottom!);
			expect(proofCase.player.behind.centerDeltaFromCutoffPx).toBeLessThan(0);
			expect(proofCase.player.front.centerDeltaFromCutoffPx).toBeGreaterThan(0);
			expect(proofCase.player.behind.world.y).toBeLessThan(
				proofCase.blocker.world.y - proofCase.blocker.world.height / 2
			);
			expect(proofCase.player.front.world.y).toBeGreaterThan(
				proofCase.blocker.world.y + proofCase.blocker.world.height / 2
			);
			for (const position of Object.values(proofCase.player)) {
				expect(
					isInsideAnyCollisionRect(
						position.world.x,
						position.world.y,
						collisionRects,
						PLAYER_COLLISION_RADIUS
					)
				).toBe(false);
			}
		}
	});

	it('subtracts every feather-band blocker from the geometric base and foreground masks', () => {
		const inputs = buildSundropVillageObstacleControlInputs();
		const blockersById = new Map(
			(inputs.map.blockers ?? []).map((blocker) => [blocker.id, blocker])
		);
		const featherBands = ['village-block-0-37', 'village-block-0-49', 'village-block-46-2'].map(
			(id) => {
				const blocker = blockersById.get(id);
				if (!blocker) throw new Error(`Missing expected feather-band blocker: ${id}`);
				return {
					x: blocker.x - inputs.crop.x,
					y: blocker.y - inputs.crop.y,
					width: blocker.width,
					height: blocker.height
				};
			}
		);
		for (const maskRect of [...inputs.baseRects, ...inputs.foregroundRects]) {
			for (const featherBand of featherBands) {
				expect(intersects(maskRect, featherBand)).toBe(false);
			}
		}
	});

	it('protects live Sundrop footprints including both full stone-lantern renders', () => {
		const inputs = buildSundropVillageObstacleControlInputs();
		const lanterns = (inputs.map.mapDecor ?? []).filter((decor) => {
			if (decor.frameName !== 'stoneLantern') return false;
			return (
				decor.x + decor.width / 2 > inputs.crop.x &&
				decor.x - decor.width / 2 < inputs.crop.x + inputs.crop.width &&
				decor.y + decor.height / 2 > inputs.crop.y &&
				decor.y - decor.height / 2 < inputs.crop.y + inputs.crop.height
			);
		});
		expect(lanterns).toHaveLength(2);
		for (const lantern of lanterns) {
			expect(inputs.protectedRects).toContainEqual(
				expect.objectContaining({ id: lantern.id, width: 180, height: 180 })
			);
		}
		for (const decor of inputs.map.mapDecor ?? []) {
			if (
				decor.x + decor.width / 2 > inputs.crop.x &&
				decor.x - decor.width / 2 < inputs.crop.x + inputs.crop.width &&
				decor.y + decor.height / 2 > inputs.crop.y &&
				decor.y - decor.height / 2 < inputs.crop.y + inputs.crop.height
			) {
				expect(inputs.protectedRects).toContainEqual(
					expect.objectContaining({ id: decor.id, width: decor.width, height: decor.height })
				);
			}
		}
		for (const [prefix, items] of [
			['transition', inputs.map.transitions],
			['encounter', inputs.map.encounters ?? []],
			['discovery', inputs.map.discoveries ?? []],
			['pickup', inputs.map.pickups ?? []]
		] as const) {
			for (const item of items) {
				if (
					item.x >= inputs.crop.x &&
					item.x <= inputs.crop.x + inputs.crop.width &&
					item.y >= inputs.crop.y &&
					item.y <= inputs.crop.y + inputs.crop.height
				) {
					expect(inputs.protectedRects).toContainEqual(
						expect.objectContaining({ id: `${prefix}-${item.id}` })
					);
				}
			}
		}
	});

	it('invalidates the fingerprint for all approved ownership and source inputs', () => {
		const inputs = buildSundropVillageObstacleControlInputs();
		const fingerprint = computeSundropVillageObstacleControlFingerprint(inputs);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				ownership: SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((entry, index) =>
					index === 0 ? { ...entry, ownerBackgroundIds: ['changed-owner'] } : entry
				)
			})
		).not.toBe(fingerprint);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				ownership: inputs.ownership.map((entry, index) =>
					index === 0
						? { ...entry, baseMargins: { ...entry.baseMargins, top: entry.baseMargins.top + 1 } }
						: entry
				)
			})
		).not.toBe(fingerprint);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				protectedRects: [{ ...inputs.protectedRects[0], width: inputs.protectedRects[0].width + 1 }]
			})
		).not.toBe(fingerprint);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				heroDisplayHeight: inputs.heroDisplayHeight + 1
			})
		).not.toBe(fingerprint);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				sourceHashes: {
					...inputs.sourceHashes,
					'sundrop-village-hpa-307-ground-input.png': 'changed'
				}
			})
		).not.toBe(fingerprint);
		expect(
			computeSundropVillageObstacleControlFingerprint({
				...inputs,
				hpa307ArtifactHashes: { ...inputs.hpa307ArtifactHashes, changed: 'hash' }
			})
		).not.toBe(fingerprint);
	});
});
