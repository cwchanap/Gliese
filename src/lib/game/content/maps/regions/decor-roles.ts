export const villageDecorRoles = {
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
} as const;

export type VillageDecorId = keyof typeof villageDecorRoles;
export type VillageDecorRole = (typeof villageDecorRoles)[VillageDecorId];
