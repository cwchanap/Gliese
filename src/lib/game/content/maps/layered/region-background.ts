import type {
	MapBackgroundImage,
	MapBackgroundPlane,
	MapDecor
} from '$lib/game/content/maps/types';
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';

export function createLayeredRegionBackground<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: {
		id: string;
		textureKey: string;
		plane: MapBackgroundPlane;
	}
): MapBackgroundImage {
	const width = source.width * source.tileSize;
	const height = source.height * source.tileSize;

	return {
		id: input.id,
		textureKey: input.textureKey,
		x: source.origin.x + width / 2,
		y: source.origin.y + height / 2,
		width,
		height,
		plane: input.plane
	};
}
