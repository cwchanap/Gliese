import type { MapBlockerKind } from './types';

export type BlockerRuntimeRenderMode = 'collision-only' | 'rendered-live';

/**
 * Runtime visual contract shared by WorldScene and authoring ownership.
 * Ocean blockers contribute collision only; their paired ground/decor sources
 * supply the visible water. Every other blocker kind has a live sprite path.
 */
export function getBlockerRuntimeRenderMode(kind: MapBlockerKind): BlockerRuntimeRenderMode {
	switch (kind) {
		case 'ocean':
			return 'collision-only';
		case 'city-wall':
		case 'town-hedge':
		case 'garden-hedge':
		case 'ruin-wall':
		case 'future-gate':
			return 'rendered-live';
		default:
			kind satisfies never;
			throw new Error(`Unknown blocker kind: ${kind}`);
	}
}
