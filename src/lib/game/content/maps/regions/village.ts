import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — the bottom-left (SW) settlement of Sundrop. An authored
 * JRPG miniature: home yard → well plaza → market lane / north residences /
 * shrine garden / east gate. Every pixel region has a job.
 *
 * The layout is compiled from the layered tile source
 * (village-layered.ts) by compileLayeredRegion; no hand-authored pixel
 * coordinates, blockers, groundPatches, or mapDecor remain in this file.
 * Buildings form a C-shape around the central well plaza, which acts as the
 * navigation anchor. Four routes radiate from the plaza: west (market/
 * blacksmith), north (residences/guild), southeast (shrine garden + hidden
 * pocket), and northeast (east gate → crossroads).
 */
export const villageRegion: RegionFragment = compileLayeredRegion(sundropVillageLayered);
