import { describe, expect, it } from 'vitest';

import { getBlockerRuntimeRenderMode } from './blocker-rendering';
import type { MapBlockerKind } from './types';

describe('getBlockerRuntimeRenderMode', () => {
	it('returns collision-only for ocean blockers and rendered-live for every other kind', () => {
		expect(getBlockerRuntimeRenderMode('ocean')).toBe('collision-only');
		expect(getBlockerRuntimeRenderMode('city-wall')).toBe('rendered-live');
		expect(getBlockerRuntimeRenderMode('town-hedge')).toBe('rendered-live');
		expect(getBlockerRuntimeRenderMode('garden-hedge')).toBe('rendered-live');
		expect(getBlockerRuntimeRenderMode('ruin-wall')).toBe('rendered-live');
		expect(getBlockerRuntimeRenderMode('future-gate')).toBe('rendered-live');
	});

	it('throws for an unknown blocker kind to guard the exhaustive switch', () => {
		expect(() => getBlockerRuntimeRenderMode('unknown' as MapBlockerKind)).toThrow(
			/Unknown blocker kind: unknown/
		);
	});
});
