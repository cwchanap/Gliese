import { describe, expect, it, vi } from 'vitest';

const mockBackgrounds = vi.hoisted(() => [
	{
		cropId: 'sundrop-village-underlay',
		id: 'meadow-entry-sundrop-village-underlay-base-image',
		textureKey: 'meadow-entry-sundrop-village-underlay-base',
		path: '/game/assets/regions/meadow-entry/sundrop-village-underlay-base.png',
		x: 0,
		y: 0,
		width: 256,
		height: 256,
		plane: 'base' as const,
		drawOrder: 0
	}
]);

vi.mock('$lib/game/content/generated/meadow-entry-runtime', () => ({
	MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS: mockBackgrounds,
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS: []
}));

describe('meadow-entry-runtime module-level guard', () => {
	it('throws when an active crop ID has no generated background', async () => {
		await expect(import('./meadow-entry-runtime')).rejects.toThrow(
			/reference crop\(s\) with no generated background/
		);
	});
});
