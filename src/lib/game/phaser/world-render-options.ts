export interface WorldRenderOptions {
	regionalBackgrounds: boolean;
	collisionDebug: boolean;
}

export function parseWorldRenderOptions(search: string): WorldRenderOptions {
	const parameters = new URLSearchParams(search);

	return {
		regionalBackgrounds: parameters.get('regionalBackground') !== 'off',
		collisionDebug: parameters.get('mapDebug') === 'collision'
	};
}

export function resolveWorldRenderOptions(
	readSearch = () => globalThis.location?.search ?? ''
): WorldRenderOptions {
	return parseWorldRenderOptions(readSearch());
}
