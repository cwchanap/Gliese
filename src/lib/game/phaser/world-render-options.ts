export interface WorldRenderOptions {
	regionalBackgrounds: boolean;
	mapBackgroundReviewIds: readonly string[];
	collisionDebug: boolean;
	movementDiagnostics: boolean;
	/** Dev link: start a fresh run on this map instead of the opening one. */
	startMapId: string | null;
	regionalBackgroundFault: {
		backgroundId: string;
		mode: 'render';
	} | null;
}

export function parseWorldRenderOptions(search: string): WorldRenderOptions {
	const parameters = new URLSearchParams(search);
	const regionalBackgroundFault = parameters.get('regionalBackgroundFault');
	const startMap = parameters.get('startMap') ?? '';
	const faultMatch = regionalBackgroundFault?.match(/^([^:]+):render$/);
	const mapBackgroundReviewIds: string[] = [];
	const seenMapBackgroundReviewIds = new Set<string>();
	for (const value of parameters.getAll('mapBackgroundReview')) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) continue;
		if (seenMapBackgroundReviewIds.has(value)) continue;
		seenMapBackgroundReviewIds.add(value);
		mapBackgroundReviewIds.push(value);
	}

	return {
		regionalBackgrounds: parameters.get('regionalBackground') !== 'off',
		mapBackgroundReviewIds: Object.freeze(mapBackgroundReviewIds),
		collisionDebug: parameters.get('mapDebug') === 'collision',
		movementDiagnostics: parameters.get('movementDiagnostics') === 'on',
		startMapId: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(startMap) ? startMap : null,
		regionalBackgroundFault: faultMatch ? { backgroundId: faultMatch[1]!, mode: 'render' } : null
	};
}

export function resolveWorldRenderOptions(
	readSearch = () => globalThis.location?.search ?? ''
): WorldRenderOptions {
	return parseWorldRenderOptions(readSearch());
}

const RENDER_OPTION_KEYS = [
	'regionalBackground',
	'mapBackgroundReview',
	'mapDebug',
	'movementDiagnostics',
	'regionalBackgroundFault',
	'startMap'
] as const;

/**
 * True when the URL carries at least one game render-option parameter. Used by
 * the shell to decide whether a URL is a direct-boot tooling link (skip Title)
 * or a normal player entry point.
 */
export function hasRenderOptionOverrides(search: string): boolean {
	const parameters = new URLSearchParams(search);
	return RENDER_OPTION_KEYS.some((key) => parameters.has(key));
}
