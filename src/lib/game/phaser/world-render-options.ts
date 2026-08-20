export interface WorldRenderOptions {
	regionalBackgrounds: boolean;
	meadowPaintedPilot: boolean;
	meadowPaintedPilotOff: boolean;
	mapBackgroundReviewIds: readonly string[];
	collisionDebug: boolean;
	movementDiagnostics: boolean;
	regionalBackgroundFault: {
		backgroundId: string;
		mode: 'render';
	} | null;
}

export function parseWorldRenderOptions(search: string): WorldRenderOptions {
	const parameters = new URLSearchParams(search);
	const regionalBackgroundFault = parameters.get('regionalBackgroundFault');
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
		meadowPaintedPilot: parameters.get('meadowPaintedPilot') === 'on',
		meadowPaintedPilotOff: parameters.get('meadowPaintedPilot') === 'off',
		mapBackgroundReviewIds: Object.freeze(mapBackgroundReviewIds),
		collisionDebug: parameters.get('mapDebug') === 'collision',
		movementDiagnostics: parameters.get('movementDiagnostics') === 'on',
		regionalBackgroundFault: faultMatch ? { backgroundId: faultMatch[1]!, mode: 'render' } : null
	};
}

export function resolveWorldRenderOptions(
	readSearch = () => globalThis.location?.search ?? ''
): WorldRenderOptions {
	return parseWorldRenderOptions(readSearch());
}
