import { describe, expect, it } from 'vitest';

import { isNpcPackFrameName } from '$lib/game/content/assets';
import { maps } from '$lib/game/content/maps';
import {
	buildMapNavigationObstacles,
	resolveMapNavigationGrid
} from '$lib/game/content/maps/navigation';
import { mainQuestIds, quests } from '$lib/game/content/quests';
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS,
	STARTER_NPC_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { isPositionWalkable } from '$lib/game/core/navigation';
import { getStoryProgress } from '$lib/game/core/quests';
import { questStateAt } from '$lib/game/core/quests.fixtures';
import { applyStoryGates, storyGateSignature } from '$lib/game/core/story-gates';

import { overworldMap } from './map';
import { caveArrival, overworldDoorArrival } from './places';
import { prologuePlacements } from './prologue';

type Point = { x: number; y: number };

const STEP_PX = 16;
// Mirrors WorldScene: transition trigger (player radius + 18), pickup radius, default discovery radius.
const TRANSITION_TRIGGER_PX = PLAYER_COLLISION_RADIUS + 18;
const PICKUP_RADIUS = 18;
const DISCOVERY_RADIUS = 64;

const reachedByGates = new Map<string, Uint8Array>();

/**
 * Every spot the player can stand on at this point of the story, flood-filled through the
 * runtime collision from where the player is: Grik's door, or the tunnel mouth once he has
 * escaped through it. Cached per set of live story gates and start.
 */
function reachableAt(objectiveId: string) {
	const progress = getStoryProgress(questStateAt(objectiveId));
	const map = applyStoryGates(overworldMap, progress);
	const grid = resolveMapNavigationGrid(map);
	const cols = Math.floor(grid.widthPx / STEP_PX);
	const rows = Math.floor(grid.heightPx / STEP_PX);
	const centre = (cell: number) => cell * STEP_PX + STEP_PX / 2;
	const start = progress.questId === 'prologue-escape' ? caveArrival : map.spawn;

	const gateKey = `${storyGateSignature(overworldMap, progress)}@${start.x},${start.y}`;
	let reached = reachedByGates.get(gateKey);
	if (!reached) {
		const obstacles = buildMapNavigationObstacles(map, { includeInteractableNpcs: true });
		const standable = (col: number, row: number) =>
			isPositionWalkable(
				grid,
				obstacles,
				{ x: centre(col), y: centre(row) },
				PLAYER_COLLISION_RADIUS
			);
		reached = new Uint8Array(cols * rows);
		const queue = [Math.floor(start.y / STEP_PX) * cols + Math.floor(start.x / STEP_PX)];
		reached[queue[0]!] = 1;
		while (queue.length > 0) {
			const index = queue.pop()!;
			const col = index % cols;
			const row = (index - col) / cols;
			for (const [nextCol, nextRow] of [
				[col + 1, row],
				[col - 1, row],
				[col, row + 1],
				[col, row - 1]
			] as const) {
				if (nextCol < 0 || nextRow < 0 || nextCol >= cols || nextRow >= rows) continue;
				const next = nextRow * cols + nextCol;
				if (reached[next] || !standable(nextCol, nextRow)) continue;
				reached[next] = 1;
				queue.push(next);
			}
		}
		reachedByGates.set(gateKey, reached);
	}
	const flood = reached;

	return {
		map,
		/** Whether a reachable standing spot lies within `limit` of the point. */
		withinReach(point: Point, limit: number): boolean {
			const span = Math.ceil(limit / STEP_PX);
			const pointCol = Math.floor(point.x / STEP_PX);
			const pointRow = Math.floor(point.y / STEP_PX);
			for (
				let row = Math.max(0, pointRow - span);
				row <= Math.min(rows - 1, pointRow + span);
				row++
			) {
				for (
					let col = Math.max(0, pointCol - span);
					col <= Math.min(cols - 1, pointCol + span);
					col++
				) {
					if (
						flood[row * cols + col] &&
						Math.hypot(centre(col) - point.x, centre(row) - point.y) <= limit
					) {
						return true;
					}
				}
			}
			return false;
		}
	};
}

describe('overworld placements', () => {
	it('keeps placement ids unique within each kind', () => {
		for (const field of [
			'transitions',
			'npcs',
			'ambientNpcs',
			'encounters',
			'combatBounds',
			'pickups',
			'discoveries'
		] as const) {
			const ids = (overworldMap[field] ?? []).map((entry) => entry.id);
			expect(new Set(ids).size, field).toBe(ids.length);
		}
	});

	it('gives every story pack its own pocket', () => {
		expect(overworldMap.combatBounds?.map((bounds) => bounds.encounterIds)).toEqual(
			overworldMap.encounters?.map((encounter) => [encounter.id])
		);
	});

	it('enters each interior at its spawn and steps back out just past the door', () => {
		const navigation = resolveMapNavigationGrid(overworldMap);
		const obstacles = buildMapNavigationObstacles(overworldMap, { includeInteractableNpcs: false });
		const doors = overworldMap.transitions.filter((transition) => !transition.marker);
		expect(doors).toHaveLength(8);
		for (const door of doors) {
			const interior = maps[door.toMapId]!;
			expect(door.arrival, door.id).toEqual({ ...interior.spawn, facing: 'up' });

			const exit = interior.transitions.find((transition) => transition.toMapId === 'overworld');
			const back = overworldDoorArrival(door.toMapId as Parameters<typeof overworldDoorArrival>[0]);
			expect(exit?.arrival, door.id).toEqual(back);
			expect(Math.hypot(back.x - door.x, back.y - door.y), door.id).toBeGreaterThan(
				TRANSITION_TRIGGER_PX
			);
			expect(
				isPositionWalkable(
					navigation,
					obstacles,
					back,
					PLAYER_COLLISION_RADIUS,
					'resting-position'
				),
				door.id
			).toBe(true);
		}
	});

	it('opens the tunnel mouth only on the escape, next to where Grik comes out', () => {
		const cave = overworldMap.transitions.find(
			(transition) => transition.toMapId === 'ruins-threshold'
		)!;
		expect(cave.activeDuring).toEqual({ quests: ['prologue-escape'] });
		expect(Math.hypot(caveArrival.x - cave.x, caveArrival.y - cave.y)).toBeGreaterThan(
			TRANSITION_TRIGGER_PX
		);
		expect(Math.hypot(caveArrival.x - cave.x, caveArrival.y - cave.y)).toBeLessThanOrEqual(256);
		expect(maps['ruins-threshold']!.transitions[0]).toMatchObject({
			toMapId: 'overworld',
			arrival: caveArrival
		});
	});
});

describe('prologue placements', () => {
	const objectiveIds = mainQuestIds.flatMap((questId) =>
		quests[questId].objectives.map((objective) => objective.id)
	);
	const ids = (entries: readonly { id: string }[]) => new Set(entries.map((entry) => entry.id));
	const prologueIds = {
		npcs: ids(prologuePlacements.npcs),
		encounters: ids(prologuePlacements.encounters),
		discoveries: ids(prologuePlacements.discoveries),
		pickups: ids(prologuePlacements.pickups)
	};

	it.each(objectiveIds)(
		'keeps every live prologue placement within reach at %s',
		(objectiveId) => {
			const { map, withinReach } = reachableAt(objectiveId);
			const unreachable: string[] = [];
			const check = (kind: string, entry: Point & { id: string }, limit: number) => {
				if (!withinReach(entry, limit))
					unreachable.push(`${kind} ${entry.id} (${entry.x}, ${entry.y})`);
			};

			for (const npc of map.npcs ?? []) {
				if (!prologueIds.npcs.has(npc.id)) continue;
				const npcRadius = isNpcPackFrameName(npc.frameName)
					? NPC_PACK_COLLISION_RADIUS
					: STARTER_NPC_COLLISION_RADIUS;
				check('npc', npc, PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS + npcRadius);
			}
			for (const discovery of map.discoveries ?? []) {
				if (!prologueIds.discoveries.has(discovery.id)) continue;
				check(
					'discovery',
					discovery,
					PLAYER_COLLISION_RADIUS + (discovery.radius ?? DISCOVERY_RADIUS)
				);
			}
			for (const pickup of map.pickups ?? []) {
				if (!prologueIds.pickups.has(pickup.id)) continue;
				check('pickup', pickup, PLAYER_COLLISION_RADIUS + PICKUP_RADIUS);
			}
			// A pack stands on ground the player can walk onto.
			for (const encounter of map.encounters ?? []) {
				if (!prologueIds.encounters.has(encounter.id)) continue;
				check('encounter', encounter, STEP_PX);
			}

			expect(unreachable).toEqual([]);
		},
		30_000
	);
});
