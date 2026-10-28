import { gridWorldMap } from '$lib/game/content/maps/grid/compile';
import { addEnglishMapText } from '$lib/game/content/maps/text';

import { overworldDoorArrival, overworldPlaces } from './places';
import { prologuePlacements } from './prologue';
import { overworld } from './world';

const homeDoor = overworldDoorArrival('hero-house');

/** The continent as a playable map: the text grid plus everything placed on its anchors. */
export const overworldMap = addEnglishMapText({
	...gridWorldMap(overworld, 'sundrop-grik-home-door', homeDoor.facing),
	// Just outside Grik's door, so a `?startMap=overworld` run does not step straight inside.
	spawn: { x: homeDoor.x, y: homeDoor.y },
	transitions: overworldPlaces.transitions,
	npcs: prologuePlacements.npcs,
	ambientNpcs: overworldPlaces.ambientNpcs,
	encounters: prologuePlacements.encounters,
	combatBounds: prologuePlacements.combatBounds,
	pickups: [...overworldPlaces.pickups, ...prologuePlacements.pickups],
	discoveries: [...overworldPlaces.discoveries, ...prologuePlacements.discoveries]
});
