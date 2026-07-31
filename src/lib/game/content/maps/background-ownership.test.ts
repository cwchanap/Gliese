import { describe, expect, it } from 'vitest';

import {
	shouldRenderBlockerVisual,
	validateMapBackgroundOwnership
} from '$lib/game/content/maps/background-ownership';
import type { MapBlocker, WorldMapDefinition } from '$lib/game/content/maps/types';

function ownershipSource(
	backgroundIds: string[],
	blockers: MapBlocker[] = []
): Pick<WorldMapDefinition, 'backgroundImages' | 'blockers'> {
	return {
		backgroundImages: backgroundIds.map((id) => ({
			id,
			textureKey: `${id}-texture`,
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			plane: 'base'
		})),
		blockers
	};
}

describe('map background ownership', () => {
	it.each([
		['omitted metadata', undefined, [], true],
		['always', { mode: 'always' } as const, ['base'], true],
		[
			'base owner succeeds',
			{ mode: 'fallback-only', ownerBackgroundIds: ['base'] } as const,
			['base'],
			false
		],
		[
			'base owner fails',
			{ mode: 'fallback-only', ownerBackgroundIds: ['base'] } as const,
			[],
			true
		],
		[
			'one of two owners fails',
			{ mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] } as const,
			['base'],
			true
		],
		[
			'both owners succeed',
			{ mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] } as const,
			['base', 'foreground'],
			false
		]
	])('%s', (_name, visual, successfulIds, expected) => {
		const blocker = {
			id: 'blocker',
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			kind: 'garden-hedge',
			...(visual ? { visual } : {})
		} satisfies MapBlocker;

		expect(shouldRenderBlockerVisual(blocker, new Set(successfulIds))).toBe(expected);
	});

	it('rejects duplicate background descriptor IDs', () => {
		expect(() => validateMapBackgroundOwnership(ownershipSource(['base', 'base']))).toThrow(
			'Duplicate background descriptor ID: base'
		);
	});

	it('rejects a fallback-only blocker with no owners', () => {
		const blocker = {
			id: 'garden-hedge',
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			kind: 'garden-hedge',
			visual: { mode: 'fallback-only', ownerBackgroundIds: [] }
		} satisfies MapBlocker;

		expect(() => validateMapBackgroundOwnership(ownershipSource(['base'], [blocker]))).toThrow(
			'Blocker garden-hedge has an empty fallback-only owner list'
		);
	});

	it('rejects duplicate fallback-only owner IDs', () => {
		const blocker = {
			id: 'garden-hedge',
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			kind: 'garden-hedge',
			visual: { mode: 'fallback-only', ownerBackgroundIds: ['base', 'base'] }
		} satisfies MapBlocker;

		expect(() => validateMapBackgroundOwnership(ownershipSource(['base'], [blocker]))).toThrow(
			'Blocker garden-hedge has duplicate fallback-only owner ID: base'
		);
	});

	it('rejects missing fallback-only owner IDs', () => {
		const blocker = {
			id: 'garden-hedge',
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			kind: 'garden-hedge',
			visual: { mode: 'fallback-only', ownerBackgroundIds: ['missing'] }
		} satisfies MapBlocker;

		expect(() => validateMapBackgroundOwnership(ownershipSource(['base'], [blocker]))).toThrow(
			'Blocker garden-hedge references missing fallback-only owner ID: missing'
		);
	});
});
