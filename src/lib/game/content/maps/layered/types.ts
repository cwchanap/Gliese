import type { MapDecorDepth } from '$lib/game/content/maps/types';

export interface DecorGlyphSpec {
	readonly frame: string;
	readonly textureKey: string;
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
	readonly labelKey: string;
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
	readonly frameName: string;
}

export interface LayeredDiscovery {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly labelKey: string;
	readonly descriptionKey: string;
}

export interface LayeredRegionSource {
	readonly tileSize: 32;
	readonly origin: { readonly x: number; readonly y: number };
	readonly width: number;
	readonly height: number;
	readonly layers: {
		readonly terrain: readonly string[];
		readonly paths: readonly string[];
		readonly collision: readonly string[];
		readonly decor: readonly string[];
		readonly regions: readonly string[];
	};
	readonly decorGlyphTable: Record<string, DecorGlyphSpec>;
	readonly objects: {
		readonly landmarks?: readonly LayeredLandmark[];
		readonly transitions?: readonly LayeredTransition[];
		readonly pickups?: readonly LayeredPickup[];
		readonly ambientNpcs?: readonly LayeredAmbientNpc[];
		readonly discoveries?: readonly LayeredDiscovery[];
	};
}
