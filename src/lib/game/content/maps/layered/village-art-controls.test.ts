import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import {
	VILLAGE_ART_CONTROL_FILENAMES,
	canonicalizeVillageArtControlInputs,
	collectVillageArtControlData,
	computeVillageArtControlFingerprint,
	padClipWorldRectToLocal,
	renderVillageArtControlArtifacts,
	type VillageArtControlInputs
} from '$lib/game/content/maps/layered/village-art-controls';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import type { MapLandmark, WorldMapDefinition } from '$lib/game/content/maps/types';
import {
	NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
	NORMALIZE_PLAYER_RADIUS,
	NORMALIZE_TRANSITION_RADIUS,
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';
import { describe, expect, it } from 'vitest';

const EXPECTED_FILENAMES = [
	'village-art-control-manifest.json',
	'village-art-control.svg',
	'village-building-entrance-mask.svg',
	'village-composed-collision-mask.svg',
	'village-forbidden-tall-mask.svg',
	'village-layered-collision-mask.svg',
	'village-object-anchors.svg',
	'village-region-mask.svg',
	'village-terrain-path-mask.svg'
] as const;

function makeInputs(map: WorldMapDefinition = meadowEntryMap): VillageArtControlInputs {
	return {
		compiledVillage: compileLayeredRegion(sundropVillageLayered),
		map,
		strictCollisionRects: collectStrictCollisionRects(map),
		landmarkCollisionRects: collectLandmarkRects(map),
		playerRadius: NORMALIZE_PLAYER_RADIUS,
		doorwayClearanceWidth: NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
		transitionRadius: NORMALIZE_TRANSITION_RADIUS
	};
}

function cloneMap(): WorldMapDefinition {
	return structuredClone(meadowEntryMap);
}

function fingerprint(map: WorldMapDefinition): string {
	return computeVillageArtControlFingerprint(sundropVillageLayered, makeInputs(map));
}

describe('Sundrop Village HPA-307 art controls', () => {
	it('exports exactly the fixed nine-file HPA-307 inventory', () => {
		expect([...VILLAGE_ART_CONTROL_FILENAMES]).toEqual(EXPECTED_FILENAMES);
		expect(
			[...renderVillageArtControlArtifacts(sundropVillageLayered, makeInputs()).keys()].sort()
		).toEqual(EXPECTED_FILENAMES);
	});

	it('renders every SVG at the exact regional canvas dimensions without legends', () => {
		const artifacts = renderVillageArtControlArtifacts(sundropVillageLayered, makeInputs());

		for (const [filename, content] of artifacts) {
			if (!filename.endsWith('.svg')) continue;
			expect(content).toContain('viewBox="0 0 1792 1536"');
			expect(content).not.toContain('<legend');
		}
		expect(artifacts.get('village-art-control.svg')).not.toContain('<text');
	});

	it('canonicalizes semantic records by stable ID while preserving authored row order', () => {
		const inputs = makeInputs();
		const reordered: VillageArtControlInputs = {
			...inputs,
			map: {
				...inputs.map,
				transitions: [...inputs.map.transitions].reverse(),
				pickups: [...(inputs.map.pickups ?? [])].reverse(),
				ambientNpcs: [...(inputs.map.ambientNpcs ?? [])].reverse(),
				discoveries: [...(inputs.map.discoveries ?? [])].reverse(),
				mapDecor: [...(inputs.map.mapDecor ?? [])].reverse()
			},
			strictCollisionRects: [...inputs.strictCollisionRects].reverse(),
			landmarkCollisionRects: [...inputs.landmarkCollisionRects].reverse()
		};

		const canonical = canonicalizeVillageArtControlInputs(sundropVillageLayered, inputs);
		const reorderedCanonical = canonicalizeVillageArtControlInputs(
			sundropVillageLayered,
			reordered
		);
		const parsed = JSON.parse(canonical) as {
			version: number;
			source: { layers: { collision: string[] } };
			anchors: { transitions: Array<{ id: string }> };
		};

		expect(reorderedCanonical).toBe(canonical);
		expect(parsed.version).toBe(2);
		expect(parsed.source.layers.collision).toEqual(sundropVillageLayered.layers.collision);
		expect(parsed.anchors.transitions.map(({ id }) => id)).toEqual(
			[...parsed.anchors.transitions.map(({ id }) => id)].sort()
		);
	});

	it('computes one stable SHA-256 fingerprint over the canonical structural input', () => {
		const canonical = canonicalizeVillageArtControlInputs(sundropVillageLayered, makeInputs());
		const expected = createHash('sha256').update(canonical, 'utf8').digest('hex');
		const actual = computeVillageArtControlFingerprint(sundropVillageLayered, makeInputs());

		expect(actual).toBe(expected);
		expect(actual).toBe('0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33');
	});

	it('includes the player-radius sliver of corridor-wall-2b but leaves the next point open', () => {
		const data = collectVillageArtControlData(sundropVillageLayered, makeInputs());

		expect(data.isWorldPointExcluded(1_682, 4_510)).toBe(true);
		expect(data.isLocalPointExcluded(1_426, 158)).toBe(true);
		expect(data.isWorldPointExcluded(1_677, 4_510)).toBe(false);
		expect(data.isLocalPointExcluded(1_421, 158)).toBe(false);
	});

	it('forbids tall art across a tile that contains any traversable sliver', () => {
		const forbiddenTallMask = renderVillageArtControlArtifacts(
			sundropVillageLayered,
			makeInputs()
		).get('village-forbidden-tall-mask.svg');

		expect(forbiddenTallMask).toContain(
			'<rect x="1408" y="128" width="32" height="32" fill="#ffffff"/>'
		);
	});

	it('keeps the full-map north handoff open at the regional canvas edge', () => {
		const data = collectVillageArtControlData(sundropVillageLayered, makeInputs());

		expect(data.isWorldPointExcluded(1_680, 4_352)).toBe(false);
		expect(data.isLocalPointExcluded(1_424, 0)).toBe(false);
	});

	it('carves the exact runtime doorway opening from a matching landmark', () => {
		const landmark: MapLandmark = {
			id: 'test-house-exterior',
			x: 100,
			y: 100,
			width: 96,
			height: 96,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label',
			label: 'Test'
		};
		const map: WorldMapDefinition = {
			id: 'test-map',
			width: 10,
			height: 10,
			spawnDirection: 'down',
			spawn: { x: 0, y: 0 },
			landmarks: [landmark],
			transitions: [{ id: 'test-house-doorway', x: 100, y: 130, toMapId: 'test-house' }]
		};
		const rects = collectLandmarkRects(map);

		expect(NORMALIZE_DOORWAY_CLEARANCE_WIDTH).toBe(56);
		expect(NORMALIZE_TRANSITION_RADIUS).toBe(18);
		expect(rects).toEqual([
			{ x: 100, y: 82, width: 96, height: 60 },
			{ x: 62, y: 130, width: 20, height: 36 },
			{ x: 138, y: 130, width: 20, height: 36 }
		]);
		expect(isInsideAnyCollisionRect(100, 130, rects, NORMALIZE_PLAYER_RADIUS)).toBe(false);
	});

	it('pads player-center exclusion before clipping it to the regional canvas', () => {
		expect(NORMALIZE_PLAYER_RADIUS).toBe(12);
		expect(
			padClipWorldRectToLocal(
				{ id: 'west-edge', x: 250, y: 4_368, width: 20, height: 8 },
				{
					x: sundropVillageLayered.origin.x,
					y: sundropVillageLayered.origin.y,
					width: sundropVillageLayered.width * sundropVillageLayered.tileSize,
					height: sundropVillageLayered.height * sundropVillageLayered.tileSize
				},
				NORMALIZE_PLAYER_RADIUS
			)
		).toEqual({ id: 'west-edge', x: 8, y: 16, width: 16, height: 32 });
	});

	it('changes the fingerprint when a fence moves', () => {
		const original = cloneMap();
		original.fences = [
			...(original.fences ?? []),
			{ id: 'test-village-fence', x: 1_000, y: 5_000, width: 64, height: 32 }
		];
		const moved = structuredClone(original);
		const fence = moved.fences?.find(({ id }) => id === 'test-village-fence');
		expect(fence).toBeDefined();
		if (!fence) return;
		fence.x += 1;

		expect(fingerprint(moved)).not.toBe(fingerprint(original));
	});

	it('changes the fingerprint when collision-bearing decor moves', () => {
		const map = cloneMap();
		const decor = map.mapDecor?.find(
			(item) =>
				item.collision && item.x >= 256 && item.x <= 2_048 && item.y >= 4_352 && item.y <= 5_888
		);
		expect(decor?.collision).toBeDefined();
		if (!decor?.collision) return;
		decor.x += 1;
		decor.collision.x += 1;

		expect(fingerprint(map)).not.toBe(fingerprint(meadowEntryMap));
	});

	it('changes the fingerprint when non-colliding decor is removed', () => {
		const map = cloneMap();
		const decor = map.mapDecor?.find(
			(item) =>
				!item.collision && item.x >= 256 && item.x <= 2_048 && item.y >= 4_352 && item.y <= 5_888
		);
		expect(decor).toBeDefined();
		if (!decor) return;
		map.mapDecor = map.mapDecor?.filter(({ id }) => id !== decor.id);

		expect(fingerprint(map)).not.toBe(fingerprint(meadowEntryMap));
	});

	it('changes the fingerprint when a doorway transition moves', () => {
		const map = cloneMap();
		const transition = map.transitions.find(({ id }) => id === 'meadow-to-hero-house');
		expect(transition).toBeDefined();
		if (!transition) return;
		transition.x += 1;

		expect(fingerprint(map)).not.toBe(fingerprint(meadowEntryMap));
	});

	it('changes the fingerprint when the shared normalization geometry changes', () => {
		const inputs = makeInputs();
		const changed = {
			...inputs,
			playerRadius: inputs.playerRadius + 1
		};

		expect(computeVillageArtControlFingerprint(sundropVillageLayered, changed)).not.toBe(
			computeVillageArtControlFingerprint(sundropVillageLayered, inputs)
		);
	});

	it('fingerprints collision halos that reach into the canvas from outside its raw edge', () => {
		const source = {
			...sundropVillageLayered,
			origin: { x: 0, y: 0 },
			width: 1,
			height: 1,
			layers: {
				terrain: ['.'],
				paths: ['.'],
				collision: ['.'],
				decor: ['.'],
				regions: ['.']
			},
			objects: {}
		};
		const map: WorldMapDefinition = {
			id: 'edge-halo-map',
			width: 1,
			height: 1,
			spawnDirection: 'down',
			spawn: { x: 16, y: 16 },
			transitions: []
		};
		const inputsAt = (x: number): VillageArtControlInputs => ({
			compiledVillage: {},
			map,
			strictCollisionRects: [{ id: 'edge-halo', x, y: 16, width: 2, height: 2 }],
			landmarkCollisionRects: [],
			playerRadius: 12,
			doorwayClearanceWidth: 56,
			transitionRadius: 18
		});
		const firstInputs = inputsAt(-2);
		const movedInputs = inputsAt(-3);
		const firstData = collectVillageArtControlData(source, firstInputs);
		const movedData = collectVillageArtControlData(source, movedInputs);
		const firstArtifacts = renderVillageArtControlArtifacts(source, firstInputs);
		const movedArtifacts = renderVillageArtControlArtifacts(source, movedInputs);

		expect(firstData.strictCollisionRects).toEqual([
			{ id: 'edge-halo', x: 5.5, y: 16, width: 11, height: 26 }
		]);
		expect(movedData.strictCollisionRects).toEqual([
			{ id: 'edge-halo', x: 5, y: 16, width: 10, height: 26 }
		]);
		expect(firstArtifacts.get('village-composed-collision-mask.svg')).not.toBe(
			movedArtifacts.get('village-composed-collision-mask.svg')
		);
		expect(computeVillageArtControlFingerprint(source, firstInputs)).not.toBe(
			computeVillageArtControlFingerprint(source, movedInputs)
		);
	});

	it('ignores non-structural transition arrival metadata in the art fingerprint', () => {
		const source = structuredClone(sundropVillageLayered);
		const authoredTransition = source.objects.transitions?.find(
			({ id }) => id === 'meadow-to-hero-house'
		);
		const map = cloneMap();
		const compiledTransition = map.transitions.find(({ id }) => id === 'meadow-to-hero-house');
		expect(authoredTransition?.arrival).toBeDefined();
		expect(compiledTransition?.arrival).toBeDefined();
		if (!authoredTransition?.arrival || !compiledTransition?.arrival) return;
		(authoredTransition.arrival as { x: number }).x += 1;
		compiledTransition.arrival.x += 1;
		const inputs = {
			...makeInputs(map),
			compiledVillage: compileLayeredRegion(source)
		};

		expect(computeVillageArtControlFingerprint(source, inputs)).toBe(
			computeVillageArtControlFingerprint(sundropVillageLayered, makeInputs())
		);
	});

	it('matches every in-memory artifact to the committed UTF-8 byte baseline', () => {
		const artifacts = renderVillageArtControlArtifacts(sundropVillageLayered, makeInputs());
		const outputDirectory = join(process.cwd(), 'docs/superpowers/reports/img/hpa-307');

		for (const [filename, content] of artifacts) {
			expect(readFileSync(join(outputDirectory, filename), 'utf8')).toBe(content);
		}
	});
});

describe('Sundrop Village art-control rendering edge cases', () => {
	function makeMinimalSource() {
		return {
			idPrefix: 'test',
			tileSize: 32 as const,
			origin: { x: 0, y: 0 },
			width: 2,
			height: 2,
			layers: {
				terrain: ['..', '..'],
				paths: ['..', '..'],
				collision: ['..', '..'],
				decor: ['..', '..'],
				regions: ['..', '..']
			},
			decorGlyphTable: {},
			objects: {}
		};
	}

	function makeMinimalMap(overrides: Partial<WorldMapDefinition> = {}): WorldMapDefinition {
		return {
			id: 'test-map',
			width: 2,
			height: 2,
			spawnDirection: 'down',
			spawn: { x: 16, y: 16 },
			transitions: [],
			...overrides
		};
	}

	function makeMinimalInputs(map: WorldMapDefinition): VillageArtControlInputs {
		return {
			compiledVillage: compileLayeredRegion(sundropVillageLayered),
			map,
			strictCollisionRects: [],
			landmarkCollisionRects: [],
			playerRadius: NORMALIZE_PLAYER_RADIUS,
			doorwayClearanceWidth: NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
			transitionRadius: NORMALIZE_TRANSITION_RADIUS
		};
	}

	it('omits the spawn marker when the map spawn falls outside the regional canvas', () => {
		const source = makeMinimalSource();
		const map = makeMinimalMap({ spawn: { x: 10_000, y: 10_000 } });
		const artifacts = renderVillageArtControlArtifacts(source, makeMinimalInputs(map));
		const anchorsSvg = artifacts.get('village-object-anchors.svg') ?? '';

		expect(anchorsSvg).not.toContain('fill="#ffffff"');
	});

	it('skips building-entrance transitions that fall outside the regional canvas', () => {
		const source = makeMinimalSource();
		const map = makeMinimalMap({
			transitions: [{ id: 'far-away-door', x: 10_000, y: 10_000, toMapId: 'nowhere' }]
		});
		const artifacts = renderVillageArtControlArtifacts(source, makeMinimalInputs(map));
		const entranceMask = artifacts.get('village-building-entrance-mask.svg') ?? '';

		expect(entranceMask).not.toContain('fill="#f97316"');
	});

	it('renders an unknown region glyph with the magenta fallback fill', () => {
		const source = makeMinimalSource();
		(source.layers as { regions: string[] }).regions = ['X.', '..'];
		const artifacts = renderVillageArtControlArtifacts(source, makeMinimalInputs(makeMinimalMap()));
		const regionMask = artifacts.get('village-region-mask.svg') ?? '';

		expect(regionMask).toContain('fill="#ff00ff"');
	});

	it('omits the doorway entry when a landmark has no matching transition', () => {
		const source = makeMinimalSource();
		const map = makeMinimalMap({
			landmarks: [
				{
					id: 'lonely-house-exterior',
					x: 16,
					y: 16,
					width: 32,
					height: 32,
					labelKey: 'content.maps.landmarks.hero-house-exterior.label',
					label: 'Lonely'
				}
			]
		});
		const canonical = canonicalizeVillageArtControlInputs(source, makeMinimalInputs(map));
		const parsed = JSON.parse(canonical) as {
			anchors: { landmarks: Array<{ id: string; doorway?: unknown }> };
		};

		expect(parsed.anchors.landmarks).toHaveLength(1);
		expect(parsed.anchors.landmarks[0]?.doorway).toBeUndefined();
	});

	it('omits the collision field for decor items that carry no collision rect', () => {
		const source = makeMinimalSource();
		const map = makeMinimalMap({
			mapDecor: [
				{
					id: 'non-colliding-decor',
					x: 16,
					y: 16,
					width: 16,
					height: 16,
					textureKey: 'starter-pack',
					frameName: 'bush'
				}
			]
		});
		const canonical = canonicalizeVillageArtControlInputs(source, makeMinimalInputs(map));
		const parsed = JSON.parse(canonical) as {
			anchors: { decor: Array<{ id: string; collision?: unknown }> };
		};

		expect(parsed.anchors.decor).toHaveLength(1);
		expect(parsed.anchors.decor[0]?.collision).toBeUndefined();
	});
});
