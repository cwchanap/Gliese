import { getActorAnimationAsset } from '$lib/game/content/assets';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { getBlockerRuntimeRenderMode } from '$lib/game/content/maps/blocker-rendering';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';

import type { Insets } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
	MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
	type MeadowEntryAuthoringRegionId
} from './meadow-entry-authoring-layout';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRef,
	type MeadowEntrySourceType
} from './meadow-entry-source-catalog';
import { SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX } from './sundrop-village-backgrounds';
import {
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP,
	type SundropObstacleOwnershipEntry
} from './sundrop-village-obstacle-ownership';

export type MeadowEntryBakeDisposition =
	| { mode: 'base-underlay' }
	| { mode: 'base-static'; margins: Insets; motif: string }
	| {
			mode: 'base-and-foreground';
			baseMargins: Insets;
			foregroundMargins: Insets;
			frontCutoffPx: number;
			motif: string;
	  }
	| { mode: 'protected-live'; protectionMargins: Insets; reason: string }
	| { mode: 'runtime-fallback-only'; reason: string }
	| { mode: 'control-only'; reason: string };

export type MeadowEntryRuntimeOwnershipRequirement =
	| 'existing-blocker-fallback'
	| 'extend-decor-fallback'
	| 'extend-fence-fallback'
	| 'remain-live'
	| 'fallback-tile'
	| 'none';

export interface MeadowEntryBakeOwnershipEntry {
	ref: MeadowEntrySourceRef;
	primaryRegionId: MeadowEntryAuthoringRegionId;
	disposition: MeadowEntryBakeDisposition;
	runtimeRequirement: MeadowEntryRuntimeOwnershipRequirement;
}

interface ReviewedBakePolicy {
	ref: MeadowEntrySourceRef;
	disposition: MeadowEntryBakeDisposition;
	runtimeRequirement: MeadowEntryRuntimeOwnershipRequirement;
}

const BASE_MARGINS = { top: 8, right: 8, bottom: 8, left: 8 } as const;
const FOREGROUND_MARGINS = { top: 32, right: 8, bottom: 0, left: 8 } as const;
const PROTECTION_MARGINS = { top: 32, right: 16, bottom: 16, left: 16 } as const;

export const MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX =
	getActorAnimationAsset('hero').displaySize.height / 2 - PLAYER_COLLISION_RADIUS;

// Independent review seal over sorted
// `sourceKey=owner|JSON(disposition)|runtimeRequirement\n` records. The test
// owns SHA-256 computation so a catalog or disposition change cannot self-seal.
export const MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256 =
	'ab6b356e2cc6ef9308dff6d950255c3aa1decffd8de157514ce97d0a7fe0ce79';

const reviewedPolicies: ReviewedBakePolicy[] = [];

function addPolicy(
	sourceType: MeadowEntrySourceType,
	sourceId: string,
	disposition: MeadowEntryBakeDisposition,
	runtimeRequirement: MeadowEntryRuntimeOwnershipRequirement
): void {
	reviewedPolicies.push({ ref: { sourceType, sourceId }, disposition, runtimeRequirement });
}

function addPolicies(
	sourceType: MeadowEntrySourceType,
	sourceIds: readonly string[],
	disposition: MeadowEntryBakeDisposition,
	runtimeRequirement: MeadowEntryRuntimeOwnershipRequirement
): void {
	for (const sourceId of sourceIds) {
		addPolicy(sourceType, sourceId, disposition, runtimeRequirement);
	}
}

function addBaseStaticBlockers(sourceIds: readonly string[], motif: string): void {
	addPolicies(
		'blocker',
		sourceIds,
		{ mode: 'base-static', margins: BASE_MARGINS, motif },
		'existing-blocker-fallback'
	);
}

function addForegroundBlockers(sourceIds: readonly string[], motif: string): void {
	addPolicies(
		'blocker',
		sourceIds,
		{
			mode: 'base-and-foreground',
			baseMargins: BASE_MARGINS,
			foregroundMargins: FOREGROUND_MARGINS,
			frontCutoffPx: MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
			motif
		},
		'existing-blocker-fallback'
	);
}

function addPredecessorBlockerPolicy(entry: SundropObstacleOwnershipEntry): void {
	addPolicy(
		'blocker',
		entry.blockerId,
		entry.foregroundMargins
			? {
					mode: 'base-and-foreground',
					baseMargins: entry.baseMargins,
					foregroundMargins: entry.foregroundMargins,
					frontCutoffPx: MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
					motif: entry.motif
				}
			: { mode: 'base-static', margins: entry.baseMargins, motif: entry.motif },
		'existing-blocker-fallback'
	);
}

// Exact reviewed ground inventory. The southwest ocean patch is intentionally
// absent: it is registered separately as the sole ground-patch tile fallback.
addPolicies(
	'ground-patch',
	[
		'coast-approach-path',
		'coast-ferry-fork',
		'coast-sand',
		'coast-sea',
		'coast-shrine-landing',
		'coast-tidepool-pocket',
		'crossroads-coast-cue-sand',
		'crossroads-festival-road',
		'crossroads-gate-terrace',
		'crossroads-mistfen-cue-mud',
		'crossroads-nook',
		'crossroads-plaza',
		'crossroads-silverpine-cue-leaves',
		'crossroads-white-line',
		'link-crossroads-coast',
		'link-crossroads-coast-v',
		'link-crossroads-mistfen',
		'link-crossroads-mistfen-h',
		'link-crossroads-silverpine',
		'link-crossroads-wildwood',
		'link-village-crossroads',
		'link-village-crossroads-v',
		'mistfen-approach-path',
		'mistfen-basin',
		'mistfen-hidden-pool-pocket',
		'mistfen-pool-east',
		'mistfen-pool-west',
		'mistfen-safe-curve-a',
		'mistfen-safe-curve-b',
		'silverpine-bend-east',
		'silverpine-bend-west',
		'silverpine-grove-floor',
		'silverpine-lower-approach',
		'silverpine-shrine-terrace',
		'silverpine-side-grove-floor',
		'silverpine-stair-path',
		'silverpine-terrace-landing',
		'sundrop-cave-pocket',
		'sundrop-forest-road-east',
		'sundrop-forest-road-north',
		'village-crossroads-nook',
		'village-ground-0-38',
		'village-ground-1-38',
		'village-ground-10-18',
		'village-ground-11-18',
		'village-ground-12-18',
		'village-ground-13-18',
		'village-ground-14-18',
		'village-ground-15-18',
		'village-ground-16-25',
		'village-ground-16-33',
		'village-ground-17-25',
		'village-ground-17-33',
		'village-ground-18-25',
		'village-ground-18-33',
		'village-ground-19-25',
		'village-ground-19-33',
		'village-ground-2-44',
		'village-ground-20-25',
		'village-ground-20-33',
		'village-ground-21-25',
		'village-ground-21-33',
		'village-ground-22-20',
		'village-ground-22-6',
		'village-ground-23-20',
		'village-ground-23-6',
		'village-ground-24-20',
		'village-ground-24-6',
		'village-ground-25-21',
		'village-ground-25-6',
		'village-ground-26-21',
		'village-ground-26-6',
		'village-ground-27-20',
		'village-ground-27-6',
		'village-ground-28-20',
		'village-ground-28-6',
		'village-ground-29-20',
		'village-ground-29-6',
		'village-ground-3-44',
		'village-ground-30-14',
		'village-ground-30-25',
		'village-ground-31-14',
		'village-ground-31-25',
		'village-ground-32-14',
		'village-ground-32-25',
		'village-ground-33-14',
		'village-ground-33-25',
		'village-ground-34-14',
		'village-ground-34-22',
		'village-ground-35-14',
		'village-ground-35-22',
		'village-ground-36-22',
		'village-ground-36-6',
		'village-ground-37-22',
		'village-ground-37-6',
		'village-ground-38-22',
		'village-ground-38-6',
		'village-ground-39-22',
		'village-ground-39-6',
		'village-ground-4-44',
		'village-ground-40-22',
		'village-ground-40-6',
		'village-ground-41-22',
		'village-ground-41-6',
		'village-ground-42-22',
		'village-ground-42-6',
		'village-ground-43-22',
		'village-ground-5-40',
		'village-ground-6-40',
		'village-ground-7-40',
		'village-ground-8-18',
		'village-ground-9-18',
		'whispering-cave-combat-pocket',
		'wildwood-cave-branch',
		'wildwood-crossing-combat-pocket',
		'wildwood-north-combat-pocket',
		'wildwood-side-clearing'
	],
	{ mode: 'base-underlay' },
	'fallback-tile'
);
addPolicy(
	'ground-patch',
	'sundrop-southwest-ocean-patch',
	{
		mode: 'runtime-fallback-only',
		reason:
			'The reviewed southwest margin is outside every regional runtime crop; the existing sea tile remains visible fallback coverage.'
	},
	'fallback-tile'
);

for (const entry of SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP) addPredecessorBlockerPolicy(entry);

addForegroundBlockers(
	[
		'corridor-wall-10b',
		'corridor-wall-2a',
		'corridor-wall-4a',
		'corridor-wall-4b',
		'corridor-wall-6a',
		'corridor-wall-6b',
		'corridor-wall-8a',
		'corridor-wall-8b'
	],
	'hedge'
);
addForegroundBlockers(
	[
		'silverpine-grove-pocket-wall-north',
		'silverpine-grove-pocket-wall-south',
		'silverpine-mid-climb-alcove-wall-north',
		'silverpine-mid-climb-alcove-wall-south',
		'silverpine-wall-B-north',
		'silverpine-wall-B-south',
		'silverpine-wall-G-north',
		'silverpine-wall-G-south',
		'silverpine-wall-I-north',
		'silverpine-wall-I-south',
		'silverpine-wall-K-north',
		'silverpine-wall-K-south'
	],
	'tree-wall'
);
addBaseStaticBlockers(
	[
		'coast-approach-west-bank',
		'coast-crossroads-mouth-bank',
		'corridor-wall-3a',
		'corridor-wall-3b',
		'corridor-wall-5a',
		'corridor-wall-5b',
		'corridor-wall-7a',
		'corridor-wall-7b',
		'corridor-wall-9a',
		'crossroads-east-hedge',
		'crossroads-west-hedge',
		'mistfen-entry-bank-east',
		'mistfen-gate-approach-west-bank'
	],
	'hedge'
);
addBaseStaticBlockers(
	[
		'silverpine-grove-pocket-wall-west',
		'silverpine-mid-climb-alcove-wall-east',
		'silverpine-wall-A-east',
		'silverpine-wall-A-west',
		'silverpine-wall-C-east',
		'silverpine-wall-C-west',
		'silverpine-wall-E-east',
		'silverpine-wall-E-west',
		'silverpine-wall-H-east',
		'silverpine-wall-H-west',
		'silverpine-wall-J-east',
		'silverpine-wall-J-west',
		'silverpine-wall-L-east',
		'silverpine-wall-L-west'
	],
	'tree-wall'
);
addBaseStaticBlockers(
	[
		'wildwood-forest-lane-east-bank',
		'wildwood-forest-lane-west-bank',
		'wildwood-north-climb-east-bank',
		'wildwood-north-climb-west-bank'
	],
	'forest-bank'
);
addPolicy(
	'blocker',
	'coast-sea-wall',
	{
		mode: 'runtime-fallback-only',
		reason:
			'The ocean blocker is collision-only; its paired coast-sea ground patch remains the visual fallback outside every regional runtime crop.'
	},
	'fallback-tile'
);
addPolicy(
	'blocker',
	'mistfen-pool-east-blocker',
	{
		mode: 'runtime-fallback-only',
		reason:
			'The ocean blocker is collision-only; its paired mistfen-pool-east ground patch remains the visual fallback outside every regional runtime crop.'
	},
	'fallback-tile'
);
addPolicy(
	'blocker',
	'mistfen-pool-west-blocker',
	{
		mode: 'runtime-fallback-only',
		reason:
			'The ocean blocker is collision-only; its paired mistfen-pool-west ground patch remains the visual fallback outside every regional runtime crop.'
	},
	'fallback-tile'
);
addPolicies(
	'blocker',
	['castle-gate-block', 'silver-shrine-gate-block', 'witchwood-gate-block'],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Story-gate collision and visual state remain live.'
	},
	'remain-live'
);
addPolicies(
	'blocker',
	['village-block-0-37', 'village-block-0-49', 'village-block-46-2'],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'This HPA-398 feather-band blocker was deliberately excluded from baked ownership.'
	},
	'remain-live'
);
addPolicies(
	'blocker',
	[
		'meadow-east-boundary',
		'meadow-north-boundary',
		'meadow-south-boundary',
		'meadow-west-boundary'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Runtime renders this town-hedge boundary as live tree-cluster segments.'
	},
	'remain-live'
);
addPolicy(
	'blocker',
	'sundrop-southwest-ocean',
	{
		mode: 'runtime-fallback-only',
		reason:
			'The ocean blocker is collision-only; its paired sea ground patch remains visual fallback outside every regional runtime crop.'
	},
	'fallback-tile'
);

addPolicies(
	'decor',
	[
		'coast-foam',
		'coast-tidepool',
		'coast-driftwood',
		'crossroads-flowers',
		'crossroads-wildwood-cue-floor',
		'crossroads-wildwood-cue-brush',
		'mistfen-toxic-bloom',
		'mistfen-bloom-trail-1',
		'mistfen-bloom-trail-2',
		'mistfen-marsh-rock',
		'wildwood-threshold-floor',
		'wildwood-grove-floor-1',
		'wildwood-grove-brush-1',
		'wildwood-threshold-brush-left',
		'wildwood-threshold-brush-right',
		'wildwood-cache-brush-screen',
		'wildwood-staging-brush'
	],
	{ mode: 'base-static', margins: BASE_MARGINS, motif: 'low-profile-regional-decor' },
	'extend-decor-fallback'
);
addPolicies(
	'decor',
	[
		'coast-approach-net',
		'coast-boat',
		'coast-fork-west-driftwood-wall',
		'coast-jetty',
		'coast-jetty-neck',
		'coast-net',
		'coast-shrine-pocket-boundary',
		'coast-tidepool-rock-wall',
		'crossroads-banner',
		'crossroads-coast-cue-net',
		'crossroads-hanging-lantern',
		'crossroads-lantern-east',
		'crossroads-lantern-west',
		'crossroads-mistfen-cue-reeds',
		'crossroads-silverpine-cue-lantern',
		'crossroads-stall',
		'mistfen-dead-tree-east',
		'mistfen-dead-tree-west',
		'mistfen-deadfall-bend',
		'mistfen-gate-reed-wall-east',
		'mistfen-reed-wall-east',
		'mistfen-reed-wall-north',
		'mistfen-reed-wall-south',
		'mistfen-reed-wall-west',
		'mistfen-reeds-1',
		'silverpine-lantern-east',
		'silverpine-lantern-mid',
		'silverpine-lantern-west',
		'silverpine-lower-wall-east',
		'silverpine-lower-wall-west',
		'silverpine-maple-1',
		'silverpine-maple-2',
		'silverpine-offering-grove-wall',
		'silverpine-side-grove-maple',
		'silverpine-side-grove-pine',
		'silverpine-switchback-east',
		'silverpine-switchback-west',
		'silverpine-terrace-boundary',
		'silverpine-tree-1',
		'village-corridor-waymarker',
		'wildwood-cache-tree-cover',
		'wildwood-combat-pocket-wall-east',
		'wildwood-combat-pocket-wall-west',
		'wildwood-east-canopy',
		'wildwood-forest-lane-north-wall',
		'wildwood-forest-lane-south-wall',
		'wildwood-grove-maple-1',
		'wildwood-grove-tree-1',
		'wildwood-grove-tree-2',
		'wildwood-north-canopy',
		'wildwood-threshold-tree-wall-east',
		'wildwood-threshold-tree-wall-west'
	],
	{
		mode: 'base-and-foreground',
		baseMargins: BASE_MARGINS,
		foregroundMargins: FOREGROUND_MARGINS,
		frontCutoffPx: MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
		motif: 'regional-occluding-decor'
	},
	'extend-decor-fallback'
);
addPolicies(
	'decor',
	[
		'castle-gate-sprite',
		'coast-ferry-shrine',
		'coast-torii',
		'crossroads-waystone-sprite',
		'silver-shrine-gate-sprite',
		'silverpine-amulet-rack',
		'silverpine-offering',
		'witchwood-gate-sprite',
		'wildwood-cave-canopy',
		'wildwood-cave-canopy-heavy',
		'wildwood-cave-canopy-neck',
		'wildwood-cave-warning-floor',
		'village-decor-3-42',
		'village-decor-25-16',
		'village-decor-31-14',
		'village-decor-34-28',
		'village-decor-34-44',
		'village-decor-40-28',
		'village-decor-40-44',
		'village-decor-44-19'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Narrative, cave, landmark, or predecessor-owned decor remains live.'
	},
	'remain-live'
);
addPolicies(
	'decor',
	[
		'mistfen-fog',
		'mistfen-fog-entry',
		'mistfen-fog-gate',
		'mistfen-fog-middle',
		'mistfen-gate-fog-wall'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Translucent Mistfen fog remains a live foreground effect.'
	},
	'remain-live'
);

addPolicies(
	'fence',
	[
		'coast-approach-east-fence',
		'coast-approach-west-fence',
		'coast-fork-east-field-fence',
		'crossroads-north-festival-barrier',
		'crossroads-north-festival-barrier-east',
		'crossroads-south-market-fence'
	],
	{
		mode: 'base-and-foreground',
		baseMargins: BASE_MARGINS,
		foregroundMargins: FOREGROUND_MARGINS,
		frontCutoffPx: MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
		motif: 'fence-front'
	},
	'extend-fence-fallback'
);

addPolicies(
	'landmark',
	[
		'blacksmith',
		'castle-gate',
		'crossroads-waystone',
		'ferry-crossing',
		'guild-hall-exterior',
		'hero-house-exterior',
		'item-shop-exterior',
		'shrine-of-aurora',
		'silver-shrine-gate',
		'sundrop-well',
		'villager-house-1-exterior',
		'villager-house-2-exterior',
		'villager-house-3-exterior',
		'whispering-cave',
		'witchwood-gate'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Landmark and doorway approach remain live and readable.'
	},
	'remain-live'
);
addPolicies(
	'transition',
	[
		'meadow-to-guild-hall',
		'meadow-to-hero-house',
		'meadow-to-item-shop',
		'meadow-to-shrine-of-aurora',
		'meadow-to-villager-house-1',
		'meadow-to-villager-house-2',
		'meadow-to-villager-house-3',
		'meadow-to-whispering-cave-ruins-threshold'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Stateful transition and doorway marker remain live.'
	},
	'remain-live'
);
addPolicies(
	'ambient-npc',
	[
		'coast-fisher',
		'crossroads-crier',
		'crossroads-traveler',
		'mistfen-forager',
		'silverpine-pilgrim',
		'village-crier',
		'village-pilgrim',
		'village-wanderer',
		'village-woodcutter',
		'wildwood-woodcutter'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Animated ambient character remains live.'
	},
	'remain-live'
);
addPolicies(
	'pickup',
	[
		'coast-jetty-catch',
		'coast-salve',
		'crossroads-cache',
		'mistfen-cache',
		'mistfen-salve',
		'silverpine-offering-cache',
		'silverpine-tonic',
		'village-market-cache',
		'village-shrine-cache',
		'wildwood-grove-cache'
	],
	{
		mode: 'protected-live',
		protectionMargins: PROTECTION_MARGINS,
		reason: 'Collectible presence and save-state visibility remain live.'
	},
	'remain-live'
);
addPolicies(
	'encounter',
	['meadow-slime-center', 'meadow-slime-east', 'meadow-slime-west'],
	{ mode: 'control-only', reason: 'Encounter spawn state is semantic control data.' },
	'none'
);
addPolicies(
	'combat-bounds',
	[
		'whispering-cave-combat-pocket',
		'wildwood-crossing-combat-pocket',
		'wildwood-north-combat-pocket'
	],
	{ mode: 'control-only', reason: 'Combat bounds are non-visual semantic control data.' },
	'none'
);
addPolicies(
	'discovery',
	[
		'castle-gate-warning',
		'coast-jetty-foreshadow',
		'crossroads-waystone-sign',
		'ferry-shrine-lore',
		'silverpine-amulet-foreshadow',
		'wildwood-cave-danger',
		'witchwood-poison-warning'
	],
	{
		mode: 'control-only',
		reason: 'Discovery interaction and map-pin state are semantic controls.'
	},
	'none'
);

function freezeInsets(insets: Insets): Insets {
	return Object.freeze({ ...insets });
}

function freezeDisposition(disposition: MeadowEntryBakeDisposition): MeadowEntryBakeDisposition {
	switch (disposition.mode) {
		case 'base-underlay':
			return Object.freeze({ ...disposition });
		case 'base-static':
			return Object.freeze({
				...disposition,
				margins: freezeInsets(disposition.margins)
			});
		case 'base-and-foreground':
			return Object.freeze({
				...disposition,
				baseMargins: freezeInsets(disposition.baseMargins),
				foregroundMargins: freezeInsets(disposition.foregroundMargins)
			});
		case 'protected-live':
			return Object.freeze({
				...disposition,
				protectionMargins: freezeInsets(disposition.protectionMargins)
			});
		case 'runtime-fallback-only':
		case 'control-only':
			return Object.freeze({ ...disposition });
		default:
			disposition satisfies never;
			throw new Error('Unknown meadow-entry bake disposition');
	}
}

function buildMeadowEntryBakeOwnership(): readonly MeadowEntryBakeOwnershipEntry[] {
	const policiesByKey = new Map<string, ReviewedBakePolicy>();
	for (const policy of reviewedPolicies) {
		const key = meadowEntrySourceKey(policy.ref);
		if (policiesByKey.has(key)) throw new Error(`Duplicate meadow-entry bake policy "${key}"`);
		policiesByKey.set(key, policy);
	}

	const catalog = collectMeadowEntrySourceCatalog();
	const catalogKeys = new Set(catalog.map(({ ref }) => meadowEntrySourceKey(ref)));
	for (const key of policiesByKey.keys()) {
		if (!catalogKeys.has(key)) throw new Error(`Unknown meadow-entry bake policy "${key}"`);
	}

	return Object.freeze(
		catalog.map(({ ref }) => {
			const key = meadowEntrySourceKey(ref);
			const policy = policiesByKey.get(key);
			if (!policy) throw new Error(`Missing meadow-entry bake policy "${key}"`);
			const primaryRegionId = MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[key];
			if (!primaryRegionId) throw new Error(`Missing meadow-entry authoring owner "${key}"`);
			return Object.freeze({
				ref: Object.freeze({ ...ref }),
				primaryRegionId,
				disposition: freezeDisposition(policy.disposition),
				runtimeRequirement: policy.runtimeRequirement
			});
		})
	);
}

export const MEADOW_ENTRY_BAKE_OWNERSHIP = buildMeadowEntryBakeOwnership();

function assertNonEmpty(value: string, field: string, key: string): void {
	if (value.trim().length === 0) throw new Error(`${key} has empty ${field}`);
}

function assertInsets(insets: Insets, field: string, key: string): void {
	for (const [edge, value] of Object.entries(insets)) {
		if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
			throw new Error(`${key} has invalid ${field}.${edge}`);
		}
	}
}

function insetsEqual(first: Insets, second: Insets): boolean {
	return (
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom &&
		first.left === second.left
	);
}

function validateDisposition(entry: MeadowEntryBakeOwnershipEntry): void {
	const key = meadowEntrySourceKey(entry.ref);
	const { disposition, runtimeRequirement } = entry;
	if (disposition.mode === 'base-underlay') {
		if (entry.ref.sourceType !== 'ground-patch' || runtimeRequirement !== 'fallback-tile') {
			throw new Error(`${key} has invalid base-underlay ownership`);
		}
		return;
	}
	if (disposition.mode === 'runtime-fallback-only') {
		assertNonEmpty(disposition.reason, 'fallback reason', key);
		if (
			!['ground-patch', 'blocker'].includes(entry.ref.sourceType) ||
			runtimeRequirement !== 'fallback-tile'
		) {
			throw new Error(`${key} has invalid runtime fallback ownership`);
		}
		return;
	}
	if (disposition.mode === 'protected-live') {
		assertInsets(disposition.protectionMargins, 'protectionMargins', key);
		assertNonEmpty(disposition.reason, 'protection reason', key);
		if (runtimeRequirement !== 'remain-live') {
			throw new Error(`${key} protected-live source must remain live`);
		}
		if (entry.ref.sourceType === 'blocker') {
			const blocker = meadowEntryMap.blockers?.find(({ id }) => id === entry.ref.sourceId);
			if (blocker === undefined || getBlockerRuntimeRenderMode(blocker.kind) !== 'rendered-live') {
				throw new Error(
					`${key} claims protected-live but its runtime render mode does not render a live blocker`
				);
			}
		}
		return;
	}
	if (disposition.mode === 'control-only') {
		assertNonEmpty(disposition.reason, 'control reason', key);
		if (runtimeRequirement !== 'none') throw new Error(`${key} control-only source must use none`);
		return;
	}

	assertNonEmpty(disposition.motif, 'motif', key);
	const expectedRequirement =
		entry.ref.sourceType === 'blocker'
			? 'existing-blocker-fallback'
			: entry.ref.sourceType === 'decor'
				? 'extend-decor-fallback'
				: entry.ref.sourceType === 'fence'
					? 'extend-fence-fallback'
					: undefined;
	if (runtimeRequirement !== expectedRequirement) {
		throw new Error(`${key} has invalid baked runtime ownership requirement`);
	}
	if (entry.ref.sourceType === 'blocker') {
		const blocker = meadowEntryMap.blockers?.find(({ id }) => id === entry.ref.sourceId);
		if (blocker === undefined || getBlockerRuntimeRenderMode(blocker.kind) !== 'rendered-live') {
			throw new Error(
				`${key} claims an existing-blocker fallback but its runtime render mode does not render a live blocker`
			);
		}
	}
	if (disposition.mode === 'base-static') {
		assertInsets(disposition.margins, 'margins', key);
		return;
	}
	assertInsets(disposition.baseMargins, 'baseMargins', key);
	assertInsets(disposition.foregroundMargins, 'foregroundMargins', key);
	if (
		!Number.isFinite(disposition.frontCutoffPx) ||
		disposition.frontCutoffPx < 0 ||
		disposition.frontCutoffPx > MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX
	) {
		throw new Error(`${key} has invalid foreground front cutoff`);
	}
}

export interface MeadowEntryBakeOwnershipValidationOptions {
	ownership?: readonly MeadowEntryBakeOwnershipEntry[];
}

export function validateMeadowEntryBakeOwnership(
	options: MeadowEntryBakeOwnershipValidationOptions = {}
): void {
	const ownership = options.ownership ?? MEADOW_ENTRY_BAKE_OWNERSHIP;
	if (MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX !== SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX) {
		throw new Error('Meadow-entry foreground cutoff has drifted from HPA-398');
	}
	const catalog = collectMeadowEntrySourceCatalog();
	if (ownership.length !== catalog.length) {
		throw new Error('Meadow-entry bake ownership does not cover the source catalog');
	}

	const byKey = new Map<string, MeadowEntryBakeOwnershipEntry>();
	for (let index = 0; index < catalog.length; index += 1) {
		const entry = ownership[index];
		const expectedKey = meadowEntrySourceKey(catalog[index]!.ref);
		if (!entry) throw new Error(`Missing meadow-entry bake ownership "${expectedKey}"`);
		const key = meadowEntrySourceKey(entry.ref);
		if (key !== expectedKey)
			throw new Error(`Meadow-entry bake ownership is not sorted at "${key}"`);
		if (byKey.has(key)) throw new Error(`Duplicate meadow-entry bake ownership "${key}"`);
		byKey.set(key, entry);
		if (entry.primaryRegionId !== MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[key]) {
			throw new Error(`Meadow-entry bake owner drift for "${key}"`);
		}
		validateDisposition(entry);
	}

	for (const predecessor of SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP) {
		const entry = byKey.get(`blocker:${predecessor.blockerId}`);
		if (!entry || entry.runtimeRequirement !== 'existing-blocker-fallback') {
			throw new Error(`Missing HPA-398 blocker bake ownership "${predecessor.blockerId}"`);
		}
		const disposition = entry.disposition;
		const matches = predecessor.foregroundMargins
			? disposition.mode === 'base-and-foreground' &&
				disposition.motif === predecessor.motif &&
				insetsEqual(disposition.baseMargins, predecessor.baseMargins) &&
				insetsEqual(disposition.foregroundMargins, predecessor.foregroundMargins) &&
				disposition.frontCutoffPx === MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX
			: disposition.mode === 'base-static' &&
				disposition.motif === predecessor.motif &&
				insetsEqual(disposition.margins, predecessor.baseMargins);
		if (!matches) throw new Error(`HPA-398 blocker bake facts drifted "${predecessor.blockerId}"`);
	}

	for (const resolution of MEADOW_ENTRY_OUTLIER_RESOLUTIONS) {
		if (resolution.mode !== 'deferred-to-disposition') continue;
		if (!byKey.has(resolution.sourceKey)) {
			throw new Error(`Deferred outlier lacks bake disposition "${resolution.sourceKey}"`);
		}
	}
}

validateMeadowEntryBakeOwnership();
