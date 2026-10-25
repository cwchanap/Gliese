import { describe, expect, it } from 'vitest';
import { isNpcPackFrameName } from '$lib/game/content/assets';
import { meadowEntryMap } from '$lib/game/content/maps';
import {
	buildMapNavigationObstacles,
	resolveMapNavigationGrid
} from '$lib/game/content/maps/navigation';
import { prologueRegion } from '$lib/game/content/maps/regions/prologue';
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

type Point = { x: number; y: number };

const STEP_PX = 8;
// Mirrors WorldScene's pickup and default discovery interaction radii.
const PICKUP_RADIUS = 18;
const DISCOVERY_RADIUS = 64;

const reachedByGates = new Map<string, Uint8Array>();

/**
 * Every spot the player can stand on, flood-filled from spawn through the runtime
 * collision at this point of the story. Cached per set of live story gates.
 */
function reachableAt(objectiveId: string) {
	const progress = getStoryProgress(questStateAt(objectiveId));
	const map = applyStoryGates(meadowEntryMap, progress);
	const grid = resolveMapNavigationGrid(map);
	const cols = Math.floor(grid.widthPx / STEP_PX);
	const rows = Math.floor(grid.heightPx / STEP_PX);
	const centre = (cell: number) => cell * STEP_PX + STEP_PX / 2;

	const gateKey = storyGateSignature(meadowEntryMap, progress);
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
		const queue = [Math.floor(map.spawn.y / STEP_PX) * cols + Math.floor(map.spawn.x / STEP_PX)];
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

describe('prologue placements', () => {
	const objectiveIds = mainQuestIds.flatMap((questId) =>
		quests[questId].objectives.map((objective) => objective.id)
	);
	const ids = (entries: readonly { id: string }[] | undefined) =>
		new Set((entries ?? []).map((entry) => entry.id));
	const prologueIds = {
		npcs: ids(prologueRegion.npcs),
		encounters: ids(prologueRegion.encounters),
		discoveries: ids(prologueRegion.discoveries),
		pickups: ids(prologueRegion.pickups)
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
		20_000
	);
});
