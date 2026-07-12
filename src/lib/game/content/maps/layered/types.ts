import type { NpcFrameName } from '$lib/game/content/assets';
import type { MapDecor, MapDecorDepth } from '$lib/game/content/maps/types';
import type { MessageKey } from '$lib/game/i18n/translate';

/**
 * Derives the frame-name type that corresponds to a given decor texture key.
 * `MapDecor` is a discriminated union on `textureKey` — each member pairs a
 * specific sheet key with that sheet's frame-name type. This helper extracts
 * the frame-name type for a concrete `K` so that `DecorGlyphSpec<K>` enforces
 * the pairing at authoring time: a `DecorGlyphSpec<coastKey>` rejects a
 * `VillageDressingFrameName` frame, preventing the mismatched pair from
 * reaching `buildMapDecor`'s `as MapDecor` cast and Phaser's renderer.
 */
type MapDecorFrameForTexture<K extends MapDecor['textureKey']> = Extract<
	MapDecor,
	{ textureKey: K }
>['frameName'];

export interface DecorGlyphSpec<K extends MapDecor['textureKey'] = MapDecor['textureKey']> {
	readonly frame: MapDecorFrameForTexture<K>;
	readonly textureKey: K;
	readonly renderWidth: number;
	readonly renderHeight: number;
	readonly depth?: MapDecorDepth;
	readonly collision?: { readonly width: number; readonly height: number };
}

export interface LayeredLandmark {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
	readonly labelKey: MessageKey;
}

export interface LayeredTransition {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly toMapId: string;
	readonly showMarker?: boolean;
	readonly arrival?: {
		readonly x: number;
		readonly y: number;
		readonly facing: 'up' | 'down' | 'left' | 'right';
	};
}

export interface LayeredPickup {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly itemId: string;
	readonly quantity: number;
}

export interface LayeredAmbientNpc {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly frameName: NpcFrameName;
}

export interface LayeredDiscovery {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly labelKey: MessageKey;
	readonly descriptionKey: MessageKey;
}

export interface LayeredRegionSource<K extends MapDecor['textureKey'] = MapDecor['textureKey']> {
	readonly idPrefix: string;
	readonly tileSize: 32;
	readonly origin: { readonly x: number; readonly y: number };
	readonly width: number;
	readonly height: number;
	readonly layers: {
		readonly terrain: readonly string[];
		readonly paths: readonly string[];
		readonly collision: readonly string[];
		readonly decor: readonly string[];
		// Authoring aid only: labels cells by room (H/P/M/N/S/E/C) for human
		// review. The compiler dimension-validates this layer but never reads it
		// for output — it carries no runtime effect.
		readonly regions: readonly string[];
	};
	readonly decorGlyphTable: Record<string, DecorGlyphSpec<K>>;
	readonly objects: {
		readonly landmarks?: readonly LayeredLandmark[];
		readonly transitions?: readonly LayeredTransition[];
		readonly pickups?: readonly LayeredPickup[];
		readonly ambientNpcs?: readonly LayeredAmbientNpc[];
		readonly discoveries?: readonly LayeredDiscovery[];
	};
}
