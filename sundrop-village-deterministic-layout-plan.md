# Sundrop Village Deterministic Layout Plan

> **Purpose:** Replace agentic, free-form village enrichment with a deterministic, pixel-level village blueprint. The goal is a compact, explorative JRPG settlement with clear rooms, route choices, side pockets, and story-loaded spatial beats.
>
> **Core rule:** Do not let the agent freely place village objects. Use this document as the source of truth for the village area.

---

## 0. Design Diagnosis

The current village is more compact than before, but it still risks feeling like a hedge-grid or packed object cluster rather than an authored exploration space. The village should not be a square ring road with many small blockers. It should be a small JRPG settlement with a readable sequence:

```txt
home yard → well plaza → market lane / north residences / shrine garden / east gate
```

The village should teach exploration through **rooms, bends, optional pockets, and meaningful dead ends**, not raw prop count.

### Story grounding

Astelia should feel like a memory topology, not realistic geography. Sundrop Village should express the story motifs of **home, route home, gates, thresholds, shrine, names, and memory geometry**. The player should feel they are leaving a safe domestic origin and entering a larger symbolic world.

---

## 1. Coordinate Frame

Use this village design box:

```ts
const VILLAGE_BOUNDS = {
	left: 240,
	right: 1880,
	top: 4380,
	bottom: 5860
};
```

Keep the global spawn:

```ts
spawn: { x: 700, y: 5_600 }
spawnDirection: 'up'
```

The player starts outside the hero house in the **Home Yard**.

---

## 2. Intended Village Route Graph

```txt
Hero House / Home Yard
        ↓
South Lane
        ↓
Central Well Plaza
   ↙      ↑       ↘
Market   North    Shrine Garden
Lane     Residences
   ↓        ↘          ↘
Blacksmith  Guild      Hidden Offering Pocket
             ↓
         East Gate
             ↓
      Road to Crossroads
```

The village should present four interesting decisions:

1. Go west to the shop / blacksmith lane.
2. Go north to residences / guild.
3. Go southeast to shrine garden.
4. Exit northeast toward Crossroads.

The village should not feel like a perfect square ring. It should feel like a compact settlement with **bends and pockets**.

---

## 3. Landmarks

Replace the village landmark coordinates with this exact list.

```ts
landmarks: [
	{
		id: 'hero-house-exterior',
		x: 700,
		y: 5_430,
		width: 235,
		height: 246,
		labelKey: 'content.maps.landmarks.hero-house-exterior.label'
	},
	{
		id: 'item-shop-exterior',
		x: 520,
		y: 4_960,
		width: 246,
		height: 235,
		labelKey: 'content.maps.landmarks.item-shop-exterior.label'
	},
	{
		id: 'blacksmith',
		x: 380,
		y: 5_260,
		width: 235,
		height: 226,
		labelKey: 'content.maps.landmarks.blacksmith.label'
	},
	{
		id: 'villager-house-1-exterior',
		x: 870,
		y: 4_720,
		width: 226,
		height: 205,
		labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
	},
	{
		id: 'villager-house-2-exterior',
		x: 1_180,
		y: 4_660,
		width: 338,
		height: 261,
		labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
	},
	{
		id: 'guild-hall-exterior',
		x: 1_460,
		y: 4_900,
		width: 307,
		height: 277,
		labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
	},
	{
		id: 'sundrop-well',
		x: 1_000,
		y: 5_160,
		width: 141,
		height: 160,
		labelKey: 'content.maps.landmarks.sundrop-well.label'
	},
	{
		id: 'shrine-of-aurora',
		x: 1_180,
		y: 5_560,
		width: 246,
		height: 333,
		labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
	},
	{
		id: 'villager-house-3-exterior',
		x: 1_520,
		y: 5_380,
		width: 184,
		height: 333,
		labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
	}
];
```

### Why this works

The buildings create a **C-shaped village** around the well:

```txt
Shop / Houses / Guild
       ↓
Blacksmith ← Well Plaza → East House
       ↓
Hero Home / Shrine Garden
```

The well becomes the village’s navigation anchor, not just a decorative center.

---

## 4. Transitions

Update exterior transition coordinates to match the new building positions.

```ts
transitions: [
	{
		id: 'meadow-to-hero-house',
		x: 700,
		y: 5_555,
		toMapId: 'hero-house',
		showMarker: false,
		arrival: { x: 256, y: 224, facing: 'up' }
	},
	{
		id: 'meadow-to-item-shop',
		x: 520,
		y: 5_080,
		toMapId: 'item-shop',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	},
	{
		id: 'meadow-to-villager-house-1',
		x: 870,
		y: 4_825,
		toMapId: 'villager-house-1',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	},
	{
		id: 'meadow-to-villager-house-2',
		x: 1_180,
		y: 4_795,
		toMapId: 'villager-house-2',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	},
	{
		id: 'meadow-to-guild-hall',
		x: 1_460,
		y: 5_040,
		toMapId: 'guild-hall',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	},
	{
		id: 'meadow-to-shrine-of-aurora',
		x: 1_180,
		y: 5_728,
		toMapId: 'shrine-of-aurora-interior',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	},
	{
		id: 'meadow-to-villager-house-3',
		x: 1_520,
		y: 5_548,
		toMapId: 'villager-house-3',
		showMarker: false,
		arrival: { x: 256, y: 288, facing: 'up' }
	}
];
```

---

## 5. Ground Patches

Replace the current ring/spoke ground patches with these. The goal is not a perfect ring; the goal is **rooms connected by bent lanes**.

```ts
groundPatches: [
	// Room 1: Home Yard / spawn
	{
		id: 'village-home-yard',
		x: 700,
		y: 5_585,
		width: 420,
		height: 180,
		tile: 'pathTile'
	},

	// Corridor: home yard to plaza
	{
		id: 'village-south-lane',
		x: 780,
		y: 5_390,
		width: 120,
		height: 380,
		tile: 'pathTile'
	},

	// Room 2: Central well plaza
	{
		id: 'sundrop-plaza-stone',
		x: 1_000,
		y: 5_160,
		width: 500,
		height: 420,
		tile: 'plazaStoneTile'
	},

	// West route: market / blacksmith bend
	{
		id: 'village-market-lane',
		x: 650,
		y: 5_045,
		width: 560,
		height: 120,
		tile: 'pathTile'
	},
	{
		id: 'village-blacksmith-yard',
		x: 400,
		y: 5_280,
		width: 360,
		height: 300,
		tile: 'pathTile'
	},

	// North route: residences
	{
		id: 'village-north-lane',
		x: 1_050,
		y: 4_860,
		width: 860,
		height: 120,
		tile: 'pathTile'
	},
	{
		id: 'village-north-courtyard',
		x: 1_120,
		y: 4_690,
		width: 620,
		height: 200,
		tile: 'pathTile'
	},

	// Guild approach
	{
		id: 'village-guild-forecourt',
		x: 1_460,
		y: 5_040,
		width: 360,
		height: 180,
		tile: 'plazaStoneTile'
	},

	// East gate path
	{
		id: 'village-east-bend',
		x: 1_500,
		y: 4_760,
		width: 140,
		height: 420,
		tile: 'pathTile'
	},
	{
		id: 'village-gate-road',
		x: 1_760,
		y: 4_440,
		width: 520,
		height: 120,
		tile: 'pathTile'
	},

	// Shrine garden
	{
		id: 'village-shrine-path',
		x: 1_100,
		y: 5_420,
		width: 120,
		height: 440,
		tile: 'pathTile'
	},
	{
		id: 'village-shrine-garden',
		x: 1_200,
		y: 5_660,
		width: 520,
		height: 320,
		tile: 'autumnLeafTile'
	},

	// Hidden offering pocket east of shrine
	{
		id: 'village-hidden-offering-pocket',
		x: 1_520,
		y: 5_620,
		width: 300,
		height: 260,
		tile: 'autumnLeafTile'
	},

	// Existing ocean corner if still needed
	{
		id: 'sundrop-southwest-ocean-patch',
		x: 114,
		y: 6_311,
		width: 100,
		height: 50,
		tile: 'seaTile'
	}
];
```

---

## 6. Hard Blockers and Hedges

Replace most of the current `vp-*`, `vn-*`, `vw-*`, `ve-*`, and `vs-*` micro-hedges with this smaller, readable blocker set.

```ts
blockers: [
	// Global meadow boundaries: keep existing
	{
		id: 'meadow-north-boundary',
		x: 3_200,
		y: 32,
		width: 6_400,
		height: 64,
		kind: 'town-hedge'
	},
	{
		id: 'meadow-south-boundary',
		x: 3_200,
		y: 6_368,
		width: 6_400,
		height: 64,
		kind: 'town-hedge'
	},
	{
		id: 'meadow-west-boundary',
		x: 32,
		y: 3_200,
		width: 64,
		height: 6_400,
		kind: 'town-hedge'
	},
	{
		id: 'meadow-east-boundary',
		x: 6_368,
		y: 3_200,
		width: 64,
		height: 6_400,
		kind: 'town-hedge'
	},
	{
		id: 'sundrop-southwest-ocean',
		x: 114,
		y: 6_311,
		width: 100,
		height: 50,
		kind: 'ocean'
	},

	// Village outer boundary, leaving northeast gate open
	{
		id: 'village-outer-north-west',
		x: 940,
		y: 4_360,
		width: 1_360,
		height: 64,
		kind: 'garden-hedge'
	},
	{
		id: 'village-outer-north-east',
		x: 1_820,
		y: 4_360,
		width: 120,
		height: 64,
		kind: 'garden-hedge'
	},
	{
		id: 'village-outer-west',
		x: 240,
		y: 5_120,
		width: 64,
		height: 1_440,
		kind: 'garden-hedge'
	},
	{
		id: 'village-outer-south',
		x: 1_060,
		y: 5_860,
		width: 1_640,
		height: 64,
		kind: 'garden-hedge'
	},
	{
		id: 'village-outer-east-lower',
		x: 1_880,
		y: 5_240,
		width: 64,
		height: 1_200,
		kind: 'garden-hedge'
	},

	// Home yard enclosure
	{
		id: 'village-home-yard-west-fence',
		x: 500,
		y: 5_600,
		width: 40,
		height: 260,
		kind: 'garden-hedge'
	},
	{
		id: 'village-home-yard-east-fence',
		x: 920,
		y: 5_650,
		width: 40,
		height: 220,
		kind: 'garden-hedge'
	},
	{
		id: 'village-home-yard-south-fence',
		x: 700,
		y: 5_740,
		width: 420,
		height: 40,
		kind: 'garden-hedge'
	},

	// Plaza framing, with four intentional openings
	{
		id: 'village-plaza-nw-hedge',
		x: 720,
		y: 4_960,
		width: 260,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-plaza-ne-hedge',
		x: 1_300,
		y: 4_960,
		width: 260,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-plaza-west-hedge',
		x: 720,
		y: 5_280,
		width: 40,
		height: 240,
		kind: 'garden-hedge'
	},
	{
		id: 'village-plaza-east-hedge',
		x: 1_300,
		y: 5_280,
		width: 40,
		height: 240,
		kind: 'garden-hedge'
	},

	// West market / blacksmith lane boundaries
	{
		id: 'village-market-lane-north-wall',
		x: 650,
		y: 4_910,
		width: 560,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-market-lane-south-wall',
		x: 650,
		y: 5_180,
		width: 340,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-blacksmith-yard-south-wall',
		x: 400,
		y: 5_440,
		width: 360,
		height: 40,
		kind: 'garden-hedge'
	},

	// North residences lane boundaries
	{
		id: 'village-north-lane-north-wall',
		x: 1_050,
		y: 4_590,
		width: 860,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-north-lane-south-wall-west',
		x: 780,
		y: 4_980,
		width: 280,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-north-lane-south-wall-east',
		x: 1_320,
		y: 4_980,
		width: 280,
		height: 40,
		kind: 'garden-hedge'
	},

	// Guild / east gate bend
	{
		id: 'village-guild-forecourt-east-wall',
		x: 1_660,
		y: 5_040,
		width: 40,
		height: 260,
		kind: 'garden-hedge'
	},
	{
		id: 'village-east-bend-west-wall',
		x: 1_420,
		y: 4_650,
		width: 40,
		height: 500,
		kind: 'garden-hedge'
	},
	{
		id: 'village-east-bend-east-wall',
		x: 1_640,
		y: 4_700,
		width: 40,
		height: 380,
		kind: 'garden-hedge'
	},

	// Gate road to Crossroads
	{
		id: 'village-gate-road-north-wall',
		x: 1_760,
		y: 4_300,
		width: 520,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-gate-road-south-wall',
		x: 1_760,
		y: 4_580,
		width: 520,
		height: 40,
		kind: 'garden-hedge'
	},

	// Shrine garden boundaries
	{
		id: 'village-shrine-garden-west-wall',
		x: 900,
		y: 5_620,
		width: 40,
		height: 360,
		kind: 'garden-hedge'
	},
	{
		id: 'village-shrine-garden-south-wall',
		x: 1_200,
		y: 5_820,
		width: 520,
		height: 40,
		kind: 'garden-hedge'
	},
	{
		id: 'village-hidden-pocket-east-wall',
		x: 1_700,
		y: 5_620,
		width: 40,
		height: 260,
		kind: 'garden-hedge'
	},
	{
		id: 'village-hidden-pocket-north-wall',
		x: 1_520,
		y: 5_470,
		width: 300,
		height: 40,
		kind: 'garden-hedge'
	}
];
```

### Why fewer blockers are better

This turns the village into readable spaces instead of a hedge-grid test harness:

```txt
outer hedge = village boundary
plaza hedge = central room
lane hedge = road edge
garden hedge = optional pocket
```

---

## 7. Village Decor

Use the existing village-specific asset frames:

- `marketStall`
- `festivalBanner`
- `flowerBed`
- `poleLantern`
- `hangingLantern`
- `stoneLantern`
- `offeringStand`
- `autumnMaple`
- `gateArch`
- `fountain`
- `scarecrow`
- `hedgeTopiary`

Every decor object below has a job.

```ts
mapDecor: [
	// Plaza identity
	{
		id: 'village-plaza-fountain',
		textureKey: villageDressingAsset.key,
		frameName: 'fountain',
		x: 1_000,
		y: 5_250,
		width: 180,
		height: 150,
		mode: 'image'
	},
	{
		id: 'village-hanging-lantern',
		textureKey: villageDressingAsset.key,
		frameName: 'hangingLantern',
		x: 1_000,
		y: 4_980,
		width: 110,
		height: 130,
		mode: 'image',
		depth: 'foreground'
	},
	{
		id: 'village-plaza-flowers-west',
		textureKey: villageDressingAsset.key,
		frameName: 'flowerBed',
		x: 840,
		y: 5_300,
		width: 150,
		height: 120,
		mode: 'image'
	},
	{
		id: 'village-plaza-flowers-east',
		textureKey: villageDressingAsset.key,
		frameName: 'flowerBed',
		x: 1_160,
		y: 5_300,
		width: 150,
		height: 120,
		mode: 'image'
	},

	// West market lane
	{
		id: 'village-market-stall',
		textureKey: villageDressingAsset.key,
		frameName: 'marketStall',
		x: 640,
		y: 5_110,
		width: 240,
		height: 190,
		mode: 'image'
	},
	{
		id: 'village-market-banner',
		textureKey: villageDressingAsset.key,
		frameName: 'festivalBanner',
		x: 760,
		y: 4_920,
		width: 160,
		height: 220,
		mode: 'image'
	},

	// Blacksmith / field flavor
	{
		id: 'village-field-scarecrow',
		textureKey: villageDressingAsset.key,
		frameName: 'scarecrow',
		x: 330,
		y: 5_560,
		width: 120,
		height: 170,
		mode: 'image'
	},
	{
		id: 'village-blacksmith-topiary',
		textureKey: villageDressingAsset.key,
		frameName: 'hedgeTopiary',
		x: 470,
		y: 5_420,
		width: 120,
		height: 140,
		mode: 'image'
	},

	// North lane thresholds
	{
		id: 'village-north-lantern-west',
		textureKey: villageDressingAsset.key,
		frameName: 'poleLantern',
		x: 760,
		y: 4_860,
		width: 100,
		height: 200,
		mode: 'image',
		collision: {
			id: 'village-north-lantern-west-collision',
			x: 760,
			y: 4_940,
			width: 50,
			height: 60
		}
	},
	{
		id: 'village-north-lantern-east',
		textureKey: villageDressingAsset.key,
		frameName: 'poleLantern',
		x: 1_420,
		y: 4_760,
		width: 100,
		height: 200,
		mode: 'image',
		collision: {
			id: 'village-north-lantern-east-collision',
			x: 1_420,
			y: 4_840,
			width: 50,
			height: 60
		}
	},

	// Shrine garden
	{
		id: 'village-shrine-offering',
		textureKey: villageDressingAsset.key,
		frameName: 'offeringStand',
		x: 1_050,
		y: 5_620,
		width: 180,
		height: 180,
		mode: 'image',
		collision: {
			id: 'village-shrine-offering-collision',
			x: 1_050,
			y: 5_680,
			width: 80,
			height: 60
		}
	},
	{
		id: 'village-stone-lantern',
		textureKey: villageDressingAsset.key,
		frameName: 'stoneLantern',
		x: 1_320,
		y: 5_620,
		width: 180,
		height: 180,
		mode: 'image',
		collision: { id: 'village-stone-lantern-collision', x: 1_320, y: 5_680, width: 80, height: 60 }
	},
	{
		id: 'village-shrine-maple',
		textureKey: villageDressingAsset.key,
		frameName: 'autumnMaple',
		x: 1_520,
		y: 5_470,
		width: 220,
		height: 280,
		mode: 'image',
		collision: { id: 'village-shrine-maple-collision', x: 1_520, y: 5_570, width: 90, height: 80 }
	},

	// East gate
	{
		id: 'village-gate-arch',
		textureKey: villageDressingAsset.key,
		frameName: 'gateArch',
		x: 1_660,
		y: 4_430,
		width: 220,
		height: 200,
		mode: 'image'
	},
	{
		id: 'village-gate-lantern-a',
		textureKey: villageDressingAsset.key,
		frameName: 'poleLantern',
		x: 1_560,
		y: 4_440,
		width: 100,
		height: 200,
		mode: 'image',
		collision: { id: 'village-gate-lantern-a-collision', x: 1_560, y: 4_520, width: 50, height: 60 }
	},
	{
		id: 'village-gate-lantern-b',
		textureKey: villageDressingAsset.key,
		frameName: 'poleLantern',
		x: 1_760,
		y: 4_440,
		width: 100,
		height: 200,
		mode: 'image',
		collision: { id: 'village-gate-lantern-b-collision', x: 1_760, y: 4_520, width: 50, height: 60 }
	},

	// Crossroads route breadcrumb
	{
		id: 'village-corridor-waymarker',
		textureKey: villageDressingAsset.key,
		frameName: 'poleLantern',
		x: 2_120,
		y: 4_440,
		width: 100,
		height: 200,
		mode: 'image',
		collision: {
			id: 'village-corridor-waymarker-collision',
			x: 2_120,
			y: 4_520,
			width: 50,
			height: 60
		}
	}
];
```

---

## 8. Ambient NPCs

NPCs should guide routes, not stand randomly.

```ts
ambientNpcs: [
	// Immediately teaches the plaza as the village center.
	{ id: 'village-wanderer', x: 1_020, y: 5_080, frameName: 'travelerNpc' },

	// West lane: points player toward shop/blacksmith.
	{ id: 'village-woodcutter', x: 420, y: 5_060, frameName: 'woodcutterNpc' },

	// Shrine garden: makes shrine pocket feel intentional.
	{ id: 'village-pilgrim', x: 1_300, y: 5_470, frameName: 'pilgrimNpc' },

	// East gate: foreshadows road to Crossroads.
	{ id: 'village-crier', x: 1_620, y: 4_620, frameName: 'crierNpc' }
];
```

---

## 9. Pickups

Use two rewards, not many.

```ts
pickups: [
	// Teaches west-side detour.
	{
		id: 'village-market-cache',
		x: 430,
		y: 5_380,
		itemId: 'field-potion',
		quantity: 1
	},

	// Teaches shrine-side detour.
	{
		id: 'village-shrine-cache',
		x: 1_560,
		y: 5_650,
		itemId: 'sunleaf-salve',
		quantity: 1
	}
];
```

Remove or rename the current `village-corridor-cache`. A reward on the corridor is not as interesting as a reward in a side pocket.

---

## 10. Resulting Village Beats

### Beat 1: Spawn / Home Yard

Camera view should show:

- hero house behind player
- south/home yard hedge
- a path bending north
- no giant empty field

Purpose:

> “I am leaving home.”

### Beat 2: Central Well Plaza

Camera view should show:

- well / fountain
- four possible directions
- plaza flowers
- hanging lantern

Purpose:

> “This is a small village hub.”

### Beat 3: West Market / Blacksmith Lane

Camera view should show:

- item shop
- market stall
- blacksmith
- scarecrow / field cue
- dead-end reward

Purpose:

> “This is the practical village side.”

### Beat 4: North Residences / Guild

Camera view should show:

- two houses
- lantern threshold
- guild hall beyond

Purpose:

> “This is the social / quest side.”

### Beat 5: Shrine Garden

Camera view should show:

- autumn ground
- shrine
- offering stand
- maple
- hidden reward pocket

Purpose:

> “This is the spiritual / story side.”

### Beat 6: East Gate

Camera view should show:

- gate arch
- two lanterns
- road continuing out
- waymarker toward Crossroads

Purpose:

> “This is the road into the world.”

---

## 11. Pixel Map Summary

```txt
y=4380  ┌──────────────────── village north hedge ─────────────── gap/gate ──┐
        │                    [East Gate Road]                                 │
y=4660  │        House 1      House 2             Guild Hall                  │
        │           └────── North Residential Lane ───────┘                  │
y=4960  │  Item Shop     Market Lane        Well Plaza      Guild Forecourt  │
        │     ↓              ←───────────────┼───────────────→               │
y=5260  │ Blacksmith Yard                 Plaza             East House       │
        │                                    ↓                                │
y=5560  │       Hero House / Home Yard → Shrine Garden → Hidden Pocket        │
        └──────────────────── village south hedge ───────────────────────────┘
```

---

## 12. Deterministic Tests

Add a village-specific test file:

`src/lib/game/content/maps/regions/village-layout.test.ts`

### Test 1: Named rooms exist

```ts
const villageRooms = [
	{ id: 'home-yard', center: { x: 700, y: 5_585 }, radius: 260 },
	{ id: 'well-plaza', center: { x: 1_000, y: 5_160 }, radius: 320 },
	{ id: 'market-lane', center: { x: 650, y: 5_045 }, radius: 320 },
	{ id: 'north-residences', center: { x: 1_050, y: 4_860 }, radius: 420 },
	{ id: 'shrine-garden', center: { x: 1_200, y: 5_660 }, radius: 340 },
	{ id: 'east-gate', center: { x: 1_660, y: 4_430 }, radius: 260 }
];
```

Assert every room has at least one ground patch, one visual cue, and either a landmark or payoff.

### Test 2: Side rewards are off main route

Main route:

```ts
const villageMainRoute = [
	{ x: 700, y: 5_600 },
	{ x: 780, y: 5_390 },
	{ x: 1_000, y: 5_160 },
	{ x: 1_460, y: 4_900 },
	{ x: 1_660, y: 4_430 },
	{ x: 2_120, y: 4_440 }
];
```

Assert:

```ts
distancePointToPolyline(villageMarketCache, villageMainRoute) >= 160;
distancePointToPolyline(villageShrineCache, villageMainRoute) >= 160;
```

### Test 3: Path-texture-off navigation

Ignore all `groundPatches`. Use only:

- landmarks
- blockers
- fences
- colliding decor
- gate arch / lanterns

Assert the main route has visible boundaries within 320px at each sample point.

### Test 4: No random decor

Every decor ID must have one role:

```ts
const villageDecorRoles = {
	'village-plaza-fountain': 'anchor',
	'village-hanging-lantern': 'plaza-frame',
	'village-plaza-flowers-west': 'plaza-frame',
	'village-plaza-flowers-east': 'plaza-frame',
	'village-market-stall': 'market-identity',
	'village-market-banner': 'market-threshold',
	'village-field-scarecrow': 'field-background',
	'village-blacksmith-topiary': 'dead-end-frame',
	'village-north-lantern-west': 'north-threshold',
	'village-north-lantern-east': 'guild-threshold',
	'village-shrine-offering': 'shrine-symbol',
	'village-stone-lantern': 'shrine-symbol',
	'village-shrine-maple': 'hide-reward',
	'village-gate-arch': 'exit-threshold',
	'village-gate-lantern-a': 'exit-threshold',
	'village-gate-lantern-b': 'exit-threshold',
	'village-corridor-waymarker': 'crossroads-breadcrumb'
};
```

Fail if a decor object is not listed.

---

## 13. Implementation Instruction for the Agent

Give the agent this exact instruction:

```txt
Replace the current Sundrop village layout with the deterministic pixel blueprint.

Do not preserve the current ring/spoke maze if it conflicts with the blueprint.

Keep:
- spawn at (700, 5600)
- all existing village interiors and transition target map IDs
- existing asset sheets
- the overall village in the southwest of meadow-entry

Change:
- building coordinates
- transition coordinates
- ground patches
- blockers
- mapDecor
- ambient NPC placement
- pickups

Remove:
- excessive vp-* / vn-* / vw-* / ve-* / vs-* micro-hedges
- corridor-cache reward on the main path
- decorative props with no assigned role

Goal:
The village must play as a small authored JRPG settlement:
home yard → well plaza → market lane / north residences / shrine garden / east gate.
```

---

## 14. Acceptance Criteria

The village pass is successful only if all are true:

- [ ] The village no longer reads as a hedge-grid or square ring.
- [ ] The player starts in a clear Home Yard.
- [ ] The well plaza is the obvious village hub.
- [ ] The west lane has a market / blacksmith detour.
- [ ] The north lane leads to residences / guild.
- [ ] The shrine garden is optional and visually distinct.
- [ ] The east gate clearly exits toward Crossroads.
- [ ] Side rewards are in side pockets, not on the main route.
- [ ] Every decor object has a role.
- [ ] The village remains navigable with path textures ignored.
- [ ] Before/after screenshots are attached or committed.
- [ ] Existing interior transitions still work.
- [ ] `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts` passes.
- [ ] Full validation still passes:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run test:e2e
```

---

## 15. Why This Should Feel Better

This is not asking the agent to be creative. It is giving the agent a **deterministic miniature level design**.

The current village is compact, but it can still feel like a hedge-grid or packed object cluster. This blueprint gives every pixel region a job:

- home = origin
- well = hub
- west lane = commerce / work
- north lane = residents / guild
- shrine garden = optional spiritual pocket
- east gate = world exit

That is what makes a village explorative: not raw object count, but **a readable sequence of rooms, decisions, and pockets**.
