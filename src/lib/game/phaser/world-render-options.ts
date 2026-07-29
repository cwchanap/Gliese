export interface WorldRenderOptions {
	regionalBackgrounds: boolean;
	collisionDebug: boolean;
	regionalBackgroundFault: {
		backgroundId: string;
		mode: 'render';
	} | null;
}

export function parseWorldRenderOptions(search: string): WorldRenderOptions {
	const parameters = new URLSearchParams(search);
	const regionalBackgroundFault = parameters.get('regionalBackgroundFault');
	const faultMatch = regionalBackgroundFault?.match(/^([^:]+):render$/);

	return {
		regionalBackgrounds: parameters.get('regionalBackground') !== 'off',
		collisionDebug: parameters.get('mapDebug') === 'collision',
		regionalBackgroundFault: faultMatch ? { backgroundId: faultMatch[1]!, mode: 'render' } : null
	};
}

export function resolveWorldRenderOptions(
	readSearch = () => globalThis.location?.search ?? ''
): WorldRenderOptions {
	return parseWorldRenderOptions(readSearch());
}
